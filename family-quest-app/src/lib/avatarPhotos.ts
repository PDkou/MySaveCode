import { supabase } from './supabaseClient';

const BUCKET = 'avatars';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export class AvatarPhotoError extends Error {
  translationKey: string;

  constructor(translationKey: string) {
    super(translationKey);
    this.translationKey = translationKey;
  }
}

// Takes an already-cropped square JPEG blob (see PhotoCropModal, which owns
// the actual crop/zoom UI) and stores it -- this module only handles the
// storage side, not the crop math.
export async function uploadAvatarPhoto(userId: string, blob: Blob): Promise<string> {
  if (blob.size > MAX_FILE_SIZE_BYTES) {
    throw new AvatarPhotoError('profile.error.photoTooLarge');
  }

  const path = `${userId}/${Date.now()}.jpg`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) {
    throw new AvatarPhotoError('profile.error.photoUploadFailed');
  }

  return path;
}

// Best-effort -- an orphaned old avatar file left in storage after
// replacing a photo isn't worth failing the whole update over.
export async function deleteAvatarPhoto(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path]);
}

// Batch variant -- one round trip for every avatar on screen (member list,
// weekly breakdown, etc.) instead of one createSignedUrl call per avatar.
export async function getAvatarPhotoUrls(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  const map = new Map<string, string>();
  if (error || !data) return map;
  data.forEach((entry) => {
    if (entry.path && entry.signedUrl) map.set(entry.path, entry.signedUrl);
  });
  return map;
}
