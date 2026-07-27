import { supabase } from './supabaseClient';

const BUCKET = 'avatars';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60;
// AvatarChip always renders this as a circle (CSS border-radius: 50% +
// object-fit: cover), so an off-center rectangular source photo can crop
// awkwardly (e.g. cutting off a face) if stored as-is. Center-cropping to a
// square here means the stored file itself already matches what the circular
// chip will show, instead of leaving the crop to CSS guesswork.
const AVATAR_OUTPUT_SIZE = 512;

export class AvatarPhotoError extends Error {
  translationKey: string;

  constructor(translationKey: string) {
    super(translationKey);
    this.translationKey = translationKey;
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('image_decode_failed'));
    };
    image.src = objectUrl;
  });
}

export async function cropToSquareJpeg(file: File): Promise<Blob> {
  const image = await loadImage(file);
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  const sx = (image.naturalWidth - side) / 2;
  const sy = (image.naturalHeight - side) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unsupported');
  ctx.drawImage(image, sx, sy, side, side, 0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('canvas_encode_failed'));
    }, 'image/jpeg', 0.9);
  });
}

export async function uploadAvatarPhoto(userId: string, file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new AvatarPhotoError('profile.error.photoTooLarge');
  }
  if (!file.type.startsWith('image/')) {
    throw new AvatarPhotoError('profile.error.photoInvalidType');
  }

  let cropped: Blob;
  try {
    cropped = await cropToSquareJpeg(file);
  } catch {
    throw new AvatarPhotoError('profile.error.photoUploadFailed');
  }

  const path = `${userId}/${Date.now()}.jpg`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, cropped, {
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
