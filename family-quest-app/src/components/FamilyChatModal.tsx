import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { supabase } from '../lib/supabaseClient';
import { deleteFamilyChatMessage, getFamilyChatMessages, sendFamilyChatMessage } from '../lib/familyChat';
import { ChatAttachmentError, getChatAttachmentUrls } from '../lib/chatAttachments';
import { useBackDismiss } from '../lib/backNav';
import type { FamilyChatMessageRow } from '../types/database';
import { AvatarChip } from './AvatarChip';
import { ModalHeader } from './ModalHeader';

interface FamilyChatModalProps {
  onClose: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// One group chat per family (2026-08 feedback, scope decided with the
// user: family-wide only, no 1:1 DMs; attachments added in a 2026-08
// follow-up round). Structurally mirrors useTaskDetail.ts's own comments
// handling -- load + a postgres_changes realtime subscription that just
// refetches on any change, rather than reconciling the changed row into
// local state by hand (same simplicity/correctness tradeoff that hook
// already made).
export function FamilyChatModal({ onClose }: FamilyChatModalProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { family, members, avatarUrlByUserId } = useFamily();
  useBackDismiss(true, onClose);

  const [messages, setMessages] = useState<FamilyChatMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [attachmentUrls, setAttachmentUrls] = useState<Map<string, string>>(new Map());
  const listRef = useRef<HTMLDivElement>(null);

  const familyId = family?.id;

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.user_id, m.display_name));
    return map;
  }, [members]);

  const load = async () => {
    if (!familyId) return;
    try {
      const rows = await getFamilyChatMessages(familyId);
      setMessages(rows);
      setErrorKey(null);
    } catch {
      setErrorKey('chat.error.loadFailed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;
    const channel = supabase
      .channel(`family-chat-${familyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'family_chat_messages', filter: `family_id=eq.${familyId}` },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  // Signed URLs for whatever attachments are currently loaded -- one batch
  // call per message-list change instead of one createSignedUrl per
  // attachment (same reasoning as getAvatarPhotoUrls/getTaskPhotoUrls).
  useEffect(() => {
    const paths = messages
      .map((m) => m.attachment_path)
      .filter((p): p is string => !!p);
    if (paths.length === 0) {
      setAttachmentUrls(new Map());
      return;
    }
    void getChatAttachmentUrls(paths).then(setAttachmentUrls);
  }, [messages]);

  // Scrolls to the newest message on open and whenever the list grows --
  // not on every render, so e.g. a delete (list shrinks) doesn't yank the
  // scroll position back to the bottom out from under someone reading up.
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevCountRef.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  const handleAttachmentSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) setPendingAttachment(file);
  };

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    if (!familyId || !user || sending) return;
    // A photo-only message (no text) is allowed, same as any other chat
    // app -- matches the server's own family_chat_messages_has_content
    // check (schema.sql section 42).
    if (!draft.trim() && !pendingAttachment) return;
    setSending(true);
    setErrorKey(null);
    const body = draft;
    const attachment = pendingAttachment;
    setDraft('');
    setPendingAttachment(null);
    try {
      await sendFamilyChatMessage(familyId, user.id, body, attachment);
    } catch (err) {
      setErrorKey(err instanceof ChatAttachmentError ? err.translationKey : 'chat.error.sendFailed');
      setDraft(body);
      setPendingAttachment(attachment);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (messageId: string, attachmentPath: string | null) => {
    try {
      await deleteFamilyChatMessage(messageId, attachmentPath);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch {
      setErrorKey('chat.error.deleteFailed');
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(i18n.language, { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal chat-modal" onClick={(e) => e.stopPropagation()}>
        <ModalHeader title={t('chat.heading')} onClose={onClose} />

        <div className="chat-message-list" ref={listRef}>
          {loading ? (
            <p className="chat-empty">{t('common.loading')}</p>
          ) : messages.length === 0 ? (
            <p className="chat-empty">{t('chat.empty')}</p>
          ) : (
            messages.map((message) => {
              const isMine = message.author_id === user?.id;
              const name = nameById.get(message.author_id) ?? '';
              const attachmentUrl = message.attachment_path ? attachmentUrls.get(message.attachment_path) : undefined;
              const isImageAttachment = message.attachment_type?.startsWith('image/') ?? false;
              return (
                <div key={message.id} className={`chat-message ${isMine ? 'is-mine' : ''}`}>
                  {!isMine && (
                    <AvatarChip name={name} size={26} photoUrl={avatarUrlByUserId.get(message.author_id)} />
                  )}
                  <div className="chat-bubble-col">
                    {!isMine && <span className="chat-message-author">{name}</span>}
                    {attachmentUrl && isImageAttachment && (
                      <a href={attachmentUrl} target="_blank" rel="noreferrer">
                        <img src={attachmentUrl} alt={message.attachment_name ?? ''} className="chat-attachment-image" />
                      </a>
                    )}
                    {attachmentUrl && !isImageAttachment && (
                      <a href={attachmentUrl} target="_blank" rel="noreferrer" className="chat-attachment-file">
                        📄 <span className="chat-attachment-file-name">{message.attachment_name}</span>
                        {message.attachment_size != null && (
                          <span className="chat-attachment-file-size">{formatFileSize(message.attachment_size)}</span>
                        )}
                      </a>
                    )}
                    {message.body && <span className="chat-bubble">{message.body}</span>}
                    <span className="chat-message-meta">
                      {formatTime(message.created_at)}
                      {isMine && (
                        <button
                          type="button"
                          className="chat-message-delete"
                          onClick={() => void handleDelete(message.id, message.attachment_path)}
                        >
                          {t('chat.deleteMessage')}
                        </button>
                      )}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {errorKey && <p className="form-error" role="alert">{t(errorKey)}</p>}

        {pendingAttachment && (
          <div className="chat-pending-attachment">
            <span className="chat-pending-attachment-name">{pendingAttachment.name}</span>
            <button
              type="button"
              className="chat-pending-attachment-remove"
              onClick={() => setPendingAttachment(null)}
              aria-label={t('chat.removeAttachment')}
            >
              ×
            </button>
          </div>
        )}

        <form className="chat-input-row" onSubmit={(e) => void handleSend(e)}>
          <label className={`chat-attach-trigger ${sending ? 'chat-attach-trigger-disabled' : ''}`} aria-label={t('chat.attachButton')}>
            📎
            <input type="file" className="file-input-overlay" onChange={handleAttachmentSelected} disabled={sending} />
          </label>
          <input
            type="text"
            className="chat-input"
            placeholder={t('chat.placeholder')}
            maxLength={500}
            value={draft}
            disabled={sending}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={sending || (!draft.trim() && !pendingAttachment)}>
            {t('chat.send')}
          </button>
        </form>
      </div>
    </div>
  );
}
