import { MAX_RECORD_PHOTOS } from './types';
import { endAutoLockSuspension, suspendAutoLock } from './appLockGuard';
import { t } from '../i18n';

const MAGIC: readonly { type: string; test: (b: Uint8Array) => boolean }[] = [
  { type: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: 'image/png', test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { type: 'image/gif', test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 },
  { type: 'image/webp', test: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
];

/**
 * Some phones' pickers hand over a picture whose type the page cannot see (an empty `type`, or
 * `application/octet-stream`); the repository would then refuse it as "not an image". When the type is not
 * an image, look at the first bytes: a real JPEG, PNG, GIF or WebP gets its type back; anything else is kept as is.
 */
export async function withImageType(file: File): Promise<File> {
  if (file.type.startsWith('image/')) return file;
  try {
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const found = MAGIC.find((m) => m.test(head));
    return found ? new File([file], file.name, { type: found.type, lastModified: file.lastModified }) : file;
  } catch {
    return file;
  }
}

/**
 * Whether the page can draw this picture. Some phones hand over HEIC/HEIF photos: they read fine but the WebView cannot show
 * them, so the screen would stay empty without a word. Where the page cannot test this (no createImageBitmap), it says yes.
 */
async function canShow(photo: Blob): Promise<boolean> {
  if (typeof createImageBitmap !== 'function') return true;
  try {
    const bitmap = await createImageBitmap(photo);
    bitmap.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * Turns what the chooser handed over into pictures held in memory. A chosen file is only a handle to the phone's
 * gallery: reading it later can fail (a cloud photo, a permission that ended with the chooser), and the page would then show
 * nothing and say nothing. So the bytes are read right now, and a picture that cannot be read is reported.
 */
export async function collectPhotos(files: readonly File[]): Promise<File[]> {
  if (files.length === 0) throw new Error(t('사진을 가져오지 못했어요. 다시 골라 주세요.'));
  const photos: File[] = [];
  const cannotShow: string[] = [];
  let notImages = 0;
  for (const file of files.slice(0, MAX_RECORD_PHOTOS)) {
    try {
      const typed = await withImageType(file);
      if (!typed.type.startsWith('image/')) { notImages += 1; continue; }
      const bytes = await typed.arrayBuffer();
      if (bytes.byteLength === 0) continue;
      const photo = new File([bytes], typed.name, { type: typed.type, lastModified: typed.lastModified });
      if (!(await canShow(photo))) { cannotShow.push(typed.type); continue; }
      photos.push(photo);
    } catch { /* counted below */ }
  }
  if (photos.length === 0) {
    if (cannotShow.length > 0) throw new Error(t('이 사진 형식({type})은 화면에 표시할 수 없어요. JPEG나 PNG 사진을 골라 주세요.', { type: cannotShow[0] }));
    throw new Error(notImages === files.length ? t('이미지 파일만 등록할 수 있어요.') : t('사진을 읽지 못했어요. 다른 사진으로 다시 골라 주세요.'));
  }
  return photos;
}

/**
 * Opens the system image chooser (multiple, up to MAX_RECORD_PHOTOS) and
 * resolves with the chosen pictures, or [] if the user cancels; rejects with a readable message when the choice
 * could not be used. Saved photos
 * live in the on-device database (`photos` store, keyed by record id); this
 * file only handles picking. On Android the WebView shell must implement the
 * file chooser for this to open anything (V2-13+, Android QA).
 */
export function pickRecordPhotos(): Promise<File[]> {
  return new Promise((resolve, reject) => {
    suspendAutoLock(60_000); // the chooser can take a while; finish() ends it early below
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.style.display = 'none';
    let settled = false;
    const finish = (done: () => void) => {
      if (settled) return;
      settled = true;
      endAutoLockSuspension();
      input.remove();
      done();
    };
    input.addEventListener('change', () => {
      const chosen = Array.from(input.files ?? []);
      collectPhotos(chosen).then((photos) => finish(() => resolve(photos)), (e: unknown) => finish(() => reject(e)));
    });
    input.addEventListener('cancel', () => finish(() => resolve([])));
    document.body.appendChild(input);
    input.click();
  });
}
