/**
 * IndexedDB plumbing for the on-device data store. One database, one
 * connection, versioned migrations. Nothing here knows about drawers or
 * records; see repository.ts for that.
 */

export const DB_NAME = 'drawary-v2';

export const STORES = {
  drawers: 'drawers',
  fields: 'fields',
  records: 'records',
  photos: 'photos',
  settings: 'settings',
  notifications: 'notifications',
  recurrences: 'recurrences',
} as const;
export type StoreName = (typeof STORES)[keyof typeof STORES];

/**
 * Each entry upgrades the schema from version (index) to (index + 1).
 * Never edit a shipped migration; append a new one instead, so a user whose
 * data was written by an older build always upgrades through every step.
 */
const MIGRATIONS: ReadonlyArray<(db: IDBDatabase) => void> = [
  (db) => {
    db.createObjectStore(STORES.drawers, { keyPath: 'id' });
    const fields = db.createObjectStore(STORES.fields, { keyPath: 'id' });
    fields.createIndex('drawerId', 'drawerId');
    const records = db.createObjectStore(STORES.records, { keyPath: 'id' });
    records.createIndex('drawerId', 'drawerId');
    db.createObjectStore(STORES.photos, { keyPath: 'recordId' });
    db.createObjectStore(STORES.settings, { keyPath: 'key' });
  },
  // v2: notification rules (#29-#32) and recurrence rules (#33-#37).
  (db) => {
    db.createObjectStore(STORES.notifications, { keyPath: 'id' }).createIndex('drawerId', 'drawerId');
    db.createObjectStore(STORES.recurrences, { keyPath: 'id' }).createIndex('drawerId', 'drawerId');
  },
];

export const DB_VERSION = MIGRATIONS.length;

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('이 환경에서는 기기 저장소를 사용할 수 없어요.'));
  }
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      for (let v = event.oldVersion; v < DB_VERSION; v++) MIGRATIONS[v](db);
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); dbPromise = null; };
      resolve(db);
    };
    request.onerror = () => reject(request.error ?? new Error('기기 저장소를 열 수 없어요.'));
    request.onblocked = () => reject(new Error('기기 저장소가 다른 창에서 사용 중이에요.'));
  }).catch((error) => {
    dbPromise = null;
    throw error;
  });
  return dbPromise;
}

/** Closes the cached connection. Used by tests and by "reset all data". */
export async function closeDB(): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise.catch(() => null);
  dbPromise = null;
  db?.close();
}

export function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('저장소 요청에 실패했어요.'));
  });
}

/**
 * Runs `work` inside one transaction over `names`. The returned promise
 * settles only after the transaction has actually committed, so callers
 * can trust that a resolved write is durable. Inside `work`, only await
 * IDB requests (via `req`) -- awaiting anything else lets the transaction
 * auto-commit early.
 */
export async function withTx<T>(
  names: readonly StoreName[],
  mode: IDBTransactionMode,
  work: (stores: Record<StoreName, IDBObjectStore>) => Promise<T> | T,
): Promise<T> {
  const db = await openDB();
  const tx = db.transaction([...names], mode);
  const stores = {} as Record<StoreName, IDBObjectStore>;
  for (const name of names) stores[name] = tx.objectStore(name);
  const done = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('저장 중 오류가 났어요.'));
    tx.onabort = () => reject(tx.error ?? new Error('저장이 중단됐어요.'));
  });
  let result: T;
  try {
    result = await work(stores);
  } catch (error) {
    try { tx.abort(); } catch { /* already finished */ }
    await done.catch(() => undefined);
    throw error;
  }
  await done;
  return result;
}
