import { supabase } from './supabaseClient';
import { deleteChatAttachment, uploadChatAttachment } from './chatAttachments';
import type { FamilyChatMessageRow } from '../types/database';

// One group chat per family (2026-08 feedback, scope decided with the
// user: family-wide only, no 1:1 DMs). Thin direct-table wrappers under
// RLS, same shape as task_comments' own client-side pattern in
// useTaskDetail.ts (loadComments/postComment/deleteComment) -- no RPC,
// errors just propagate to the caller as plain PostgrestErrors (or
// ChatAttachmentError, from the upload step) since there's no per-field
// server validation here worth mapping to translation keys beyond that one.

export async function getFamilyChatMessages(familyId: string): Promise<FamilyChatMessageRow[]> {
  const { data, error } = await supabase
    .from('family_chat_messages')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// attachment is optional -- a message needs a non-blank body OR an
// attachment (matches schema.sql section 42's family_chat_messages_
// has_content check), so callers must not call this with both absent.
export async function sendFamilyChatMessage(
  familyId: string,
  authorId: string,
  body: string,
  attachment?: File | null,
): Promise<void> {
  // Matches the server's own family_chat_messages_body_length check
  // (schema.sql section 41) -- truncating client-side instead of letting
  // an over-length message round-trip to a rejected insert.
  const trimmed = body.trim().slice(0, 500);
  if (!trimmed && !attachment) return;

  // Generated here, not left to the row's own default, so the storage
  // path can be uploaded (and thus known) before the row exists -- the
  // object path and the row that references it are written using the same
  // id either way, just in a fixed order (upload, then insert) instead of
  // needing a second round trip to patch the path in after the fact.
  const messageId = crypto.randomUUID();
  let attachmentPath: string | null = null;

  if (attachment) {
    attachmentPath = await uploadChatAttachment(familyId, messageId, attachment);
  }

  const { error } = await supabase.from('family_chat_messages').insert({
    id: messageId,
    family_id: familyId,
    author_id: authorId,
    body: trimmed,
    attachment_path: attachmentPath,
    attachment_name: attachment?.name ?? null,
    attachment_type: attachment?.type || null,
    attachment_size: attachment?.size ?? null,
  });
  if (error) {
    // The row insert failed after the file was already uploaded -- clean
    // up the now-orphaned object rather than leaving it stranded in
    // storage with nothing pointing at it. Best-effort, same as every
    // other delete in this file: a cleanup failure here shouldn't mask
    // the real insert error being thrown below.
    if (attachmentPath) void deleteChatAttachment(attachmentPath);
    throw error;
  }
}

export async function deleteFamilyChatMessage(messageId: string, attachmentPath?: string | null): Promise<void> {
  const { error } = await supabase.from('family_chat_messages').delete().eq('id', messageId);
  if (error) throw error;
  if (attachmentPath) {
    await deleteChatAttachment(attachmentPath);
  }
}
