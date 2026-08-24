import { supabase } from './supabaseClient';
import type { FamilyChatMessageRow } from '../types/database';

// One group chat per family (2026-08 feedback, scope decided with the
// user: family-wide only, no 1:1 DMs). Thin direct-table wrappers under
// RLS, same shape as task_comments' own client-side pattern in
// useTaskDetail.ts (loadComments/postComment/deleteComment) -- no RPC,
// errors just propagate to the caller as plain PostgrestErrors, since
// there's no per-field server validation here worth mapping to translation
// keys (the only real failure mode is a network/RLS error, same as
// task_comments).

export async function getFamilyChatMessages(familyId: string): Promise<FamilyChatMessageRow[]> {
  const { data, error } = await supabase
    .from('family_chat_messages')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendFamilyChatMessage(
  familyId: string,
  authorId: string,
  body: string,
): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) return;
  const { error } = await supabase.from('family_chat_messages').insert({
    family_id: familyId,
    author_id: authorId,
    // Matches the server's own family_chat_messages_body_length check
    // (schema.sql section 41) -- truncating client-side instead of letting
    // an over-length message round-trip to a rejected insert.
    body: trimmed.slice(0, 500),
  });
  if (error) throw error;
}

export async function deleteFamilyChatMessage(messageId: string): Promise<void> {
  const { error } = await supabase.from('family_chat_messages').delete().eq('id', messageId);
  if (error) throw error;
}
