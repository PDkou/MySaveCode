import { MAX_RECORD_PHOTOS } from './types';
import { endAutoLockSuspension, suspendAutoLock } from './appLockGuard';

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
 * Opens the system image chooser (multiple, up to MAX_RECORD_PHOTOS) and
 * resolves with the chosen files, or [] if the user cancels. Saved photos
 * live in the on-device database (`photos` store, keyed by record id); this
 * file only handles picking. On Android the WebView shell must implement the
 * file chooser for this to open anything (V2-13+, Android QA).
 */
export function pickRecordPhotos(): Promise<File[]> {
  return new Promise((resolve) => {
    suspendAutoLock(60_000); // the chooser can take a while; finish() ends it early below
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.style.display = 'none';
    let settled = false;
    const finish = (selected: File[]) => {
      if (settled) return;
      settled = true;
      endAutoLockSuspension();
      input.remove();
      resolve(selected.slice(0, MAX_RECORD_PHOTOS));
    };
    input.addEventListener('change', () => {
      void Promise.all(Array.from(input.files ?? []).map(withImageType)).then(finish, () => finish(Array.from(input.files ?? [])));
    });
    input.addEventListener('cancel', () => finish([]));
    document.body.appendChild(input);
    input.click();
  });
}
