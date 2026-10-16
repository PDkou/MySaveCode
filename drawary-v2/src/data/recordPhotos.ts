/**
 * Photo storage for Drawary #17/#19.
 * Key = stable drawer id + record id, stored only on this device.
 * null = no prior entry, [] = explicitly cleared by the user.
 */
const DB_NAME = 'drawary-v2-record-photos';
const DB_VERSION = 1;
const STORE = 'record-photo-sets';
export const MAX_RECORD_PHOTOS = 3;
interface StoredPhotoSet { recordId: string; photos: Blob[]; }
function openPhotoDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('이 환경에서는 로컬 사진 저장소를 사용할 수 없어요.'));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: 'recordId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('로컬 사진 저장소를 열 수 없어요.'));
    request.onblocked = () => reject(new Error('로컬 사진 저장소가 다른 창에서 사용 중이에요.'));
  });
}
export async function loadRecordPhotoBlobs(recordId: string): Promise<Blob[] | null> {
  if (!recordId) throw new Error('보관품 ID가 없어요.');
  const db = await openPhotoDB();
  try {
    return await new Promise<Blob[] | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(recordId);
      request.onsuccess = () => {
        const entry = request.result as StoredPhotoSet | undefined;
        resolve(entry ? entry.photos : null);
      };
      request.onerror = () => reject(request.error ?? new Error('사진을 읽지 못했어요.'));
      tx.onabort = () => reject(tx.error ?? new Error('사진 읽기가 중단됐어요.'));
    });
  } finally { db.close(); }
}
export async function saveRecordPhotoBlobs(recordId: string, photos: readonly Blob[]): Promise<void> {
  if (!recordId) throw new Error('보관품 ID가 없어요.');
  if (photos.length > MAX_RECORD_PHOTOS) throw new Error('사진은 최대 3장까지 등록할 수 있어요.');
  if (photos.some(photo => !photo.type.startsWith('image/'))) {
    throw new Error('이미지 파일만 등록할 수 있어요.');
  }
  const db = await openPhotoDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ recordId, photos: [...photos] } satisfies StoredPhotoSet);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('사진 저장에 실패했어요.'));
      tx.onabort = () => reject(tx.error ?? new Error('사진 저장이 중단됐어요.'));
    });
  } finally { db.close(); }
}
export function pickRecordPhotos(): Promise<File[]> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.style.display = 'none';
    let settled = false;
    const finish = (selected: File[]) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(selected.slice(0, MAX_RECORD_PHOTOS));
    };
    input.addEventListener('change', () => finish(Array.from(input.files ?? [])));
    input.addEventListener('cancel', () => finish([]));
    document.body.appendChild(input);
    input.click();
  });
}
export function makeRecordPhotoURLs(blobs: readonly Blob[]): string[] {
  return blobs.map(blob => URL.createObjectURL(blob));
}
export function releaseRecordPhotoURLs(urls: readonly string[]): void {
  urls.filter(url => url.startsWith('blob:')).forEach(url => URL.revokeObjectURL(url));
}
