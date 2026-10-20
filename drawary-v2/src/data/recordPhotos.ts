import { MAX_RECORD_PHOTOS } from './types';
import { endAutoLockSuspension, suspendAutoLock } from './appLockGuard';

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
    input.addEventListener('change', () => finish(Array.from(input.files ?? [])));
    input.addEventListener('cancel', () => finish([]));
    document.body.appendChild(input);
    input.click();
  });
}
