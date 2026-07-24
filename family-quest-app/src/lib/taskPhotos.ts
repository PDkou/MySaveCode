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

// Batch variant for the photo gallery -- one round trip for every photo on
// screen instead of one createSignedUrl call per thumbnail.
export async function getTaskPhotoUrls(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  const map = new Map<string, string>();
  if (error || !data) return map;
  data.forEach((entry) => {
    if (entry.path && entry.signedUrl) map.set(entry.path, entry.signedUrl);
  });
  return map;
}
