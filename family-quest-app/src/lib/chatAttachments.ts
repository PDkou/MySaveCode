import { supabase } from './supabaseClient';

const BUCKET = 'chat-attachments';
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export class ChatAttachmentError extends Error {
  translationKey: string;

  constructor(translationKey: string) {
    super(translationKey);
    this.translationKey = translationKey;
  }
}

// Any file type, not just images -- "첨부파일" (attachment) covers photos
// and documents alike, unlike task-photos which is deliberately
// image-only. FamilyChatModal decides how to render each one (an <img> for
// image/* types, a plain download chip with the filename otherwise).
export async function uploadChatAttachment(familyId: string, messageId: string, file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ChatAttachmentError('chat.error.attachmentTooLarge');
  }

  // messageId is client-generated (see familyChat.ts's sendFamilyChatMessage)
  // so the object path and the message row that references it can be
  // written in either order without a round trip in between.
  const path = `${familyId}/${messageId}/${file.name}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (error) {
    throw new ChatAttachmentError('chat.error.attachmentUploadFailed');
  }

  return path;
}

// Best-effort -- called alongside deleteFamilyChatMessage; an orphaned file
// left in storage after a message row is gone isn't worth failing the
// whole delete over.
export async function deleteChatAttachment(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path]);
}

// Batch variant -- one round trip for every attachment in the loaded
// message list instead of one createSignedUrl call per message.
export async function getChatAttachmentUrls(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  const map = new Map<string, string>();
  if (error || !data) return map;
  data.forEach((entry) => {
    if (entry.path && entry.signedUrl) map.set(entry.path, entry.signedUrl);
  });
  return map;
}
