import { supabase } from './supabaseClient';

const BUCKET = 'task-photos';
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export class TaskPhotoError extends Error {
  translationKey: string;

  constructor(translationKey: string) {
    super(translationKey);
    this.translationKey = translationKey;
  }
}

export async function uploadTaskPhoto(familyId: string, taskId: string, file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new TaskPhotoError('taskDetail.error.photoTooLarge');
  }
  if (!file.type.startsWith('image/')) {
    throw new TaskPhotoError('taskDetail.error.photoInvalidType');
  }

  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
  const path = `${familyId}/${taskId}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    throw new TaskPhotoError('taskDetail.error.photoUploadFailed');
  }

  return path;
}

export async function getTaskPhotoUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data.signedUrl;
}
