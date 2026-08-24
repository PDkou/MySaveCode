import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { supabase } from '../lib/supabaseClient';
import { deleteFamilyChatMessage, getFamilyChatMessages, sendFamilyChatMessage } from '../lib/familyChat';
import { useBackDismiss } from '../lib/backNav';
import type { FamilyChatMessageRow } from '../types/database';
import { AvatarChip } from './AvatarChip';
import { ModalHeader } from './ModalHeader';

interface FamilyChatModalProps {
  onClose: () => void;
}

// One group chat per family (2026-08 feedback, scope decided with the
// user: family-wide only, no 1:1 DMs, text-only for this first pass).
// Structurally mirrors useTaskDetail.ts's own comments handling -- load +
// a postgres_changes realtime subscription that just refetches on any
// change, rather than reconciling the changed row into local state by
// hand (same simplicity/correctness tradeoff that hook already made).
export function FamilyChatModal({ onClose }: FamilyChatModalProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { family, members, avatarUrlByUserId } = useFamily();
  useBackDismiss(true, onClose);

  const [messages, setMessages] = useState<FamilyChatMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
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

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    if (!familyId || !user || sending || !draft.trim()) return;
    setSending(true);
    setErrorKey(null);
    const body = draft;
    setDraft('');
    try {
      await sendFamilyChatMessage(familyId, user.id, body);
    } catch {
      setErrorKey('chat.error.sendFailed');
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await deleteFamilyChatMessage(messageId);
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
              return (
                <div key={message.id} className={`chat-message ${isMine ? 'is-mine' : ''}`}>
                  {!isMine && (
                    <AvatarChip name={name} size={26} photoUrl={avatarUrlByUserId.get(message.author_id)} />
                  )}
                  <div className="chat-bubble-col">
                    {!isMine && <span className="chat-message-author">{name}</span>}
                    <span className="chat-bubble">{message.body}</span>
                    <span className="chat-message-meta">
                      {formatTime(message.created_at)}
                      {isMine && (
                        <button
                          type="button"
                          className="chat-message-delete"
                          onClick={() => void handleDelete(message.id)}
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

        <form className="chat-input-row" onSubmit={(e) => void handleSend(e)}>
          <input
            type="text"
            className="chat-input"
            placeholder={t('chat.placeholder')}
            maxLength={500}
            value={draft}
            disabled={sending}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={sending || !draft.trim()}>
            {t('chat.send')}
          </button>
        </form>
      </div>
    </div>
  );
}
