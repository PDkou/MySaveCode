import { useSyncExternalStore } from 'react';
import * as repo from './repository';
import type { Drawer, DrawerInput, Field, FieldInput, FieldValue, NotificationRule, RecordItem, RecurrenceRule } from './types';

/**
 * In-memory mirror of the on-device database. Screens read from this
 * synchronously; every write goes to IndexedDB first and only then
 * refreshes the mirror, so what is on screen is always what is saved.
 */
export interface StoreState {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  drawers: Drawer[];
  fields: Field[];
  records: RecordItem[];
  notificationRules: NotificationRule[];
  recurrenceRules: RecurrenceRule[];
  settings: Record<string, unknown>;
}

const INITIAL: StoreState = { status: 'loading', error: null, drawers: [], fields: [], records: [], notificationRules: [], recurrenceRules: [], settings: {} };

let state: StoreState = INITIAL;
const listeners = new Set<() => void>();
let started: Promise<void> | null = null;
// Writes run one at a time so two quick taps can never interleave their refreshes.
let queue: Promise<unknown> = Promise.resolve();

function publish(next: StoreState) {
  state = next;
  listeners.forEach((l) => l());
}

async function refresh() {
  const snap = await repo.loadAll();
  publish({ status: 'ready', error: null, ...snap });
}

/** Loads the database once; safe to call repeatedly. */
export function startStore(): Promise<void> {
  if (!started) {
    started = refresh().catch((e: unknown) => {
      publish({ ...INITIAL, status: 'error', error: e instanceof Error ? e.message : '데이터를 불러오지 못했어요.' });
    });
    // Ask the browser not to evict our data under storage pressure. Best effort.
    void navigator.storage?.persist?.().catch(() => undefined);
  }
  return started;
}

function write<T>(op: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    await startStore();
    const result = await op();
    await refresh();
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

export const actions = {
  createDrawer: (input: DrawerInput) => write(() => repo.createDrawer(input)),
  createDrawerWithFields: (input: DrawerInput, fields: readonly FieldInput[]) => write(() => repo.createDrawerWithFields(input, fields)),
  updateDrawer: (id: string, patch: Partial<DrawerInput>) => write(() => repo.updateDrawer(id, patch)),
  reorderDrawers: (ids: readonly string[]) => write(() => repo.reorderDrawers(ids)),
  deleteDrawer: (id: string) => write(() => repo.deleteDrawer(id)),

  addField: (drawerId: string, input: FieldInput) => write(() => repo.addField(drawerId, input)),
  updateField: (id: string, patch: Parameters<typeof repo.updateField>[1]) => write(() => repo.updateField(id, patch)),
  reorderFields: (drawerId: string, ids: readonly string[]) => write(() => repo.reorderFields(drawerId, ids)),
  deleteField: (id: string) => write(() => repo.deleteField(id)),

  createRecord: (drawerId: string, values: Record<string, FieldValue>, photos?: readonly Blob[]) => write(() => repo.createRecord(drawerId, values, photos)),
  updateRecord: (id: string, values: Record<string, FieldValue>, photos?: readonly Blob[]) => write(() => repo.updateRecord(id, values, photos)),
  deleteRecord: (id: string) => write(() => repo.deleteRecord(id)),

  setPhotos: (recordId: string, photos: readonly Blob[]) => write(() => repo.setPhotos(recordId, photos)),
  addNotificationRule: (drawerId: string, input: Parameters<typeof repo.addNotificationRule>[1]) => write(() => repo.addNotificationRule(drawerId, input)),
  deleteNotificationRule: (id: string) => write(() => repo.deleteNotificationRule(id)),
  addRecurrenceRule: (drawerId: string, input: repo.RecurrenceInput, todayISO: string) => write(() => repo.addRecurrenceRule(drawerId, input, todayISO)),
  deleteRecurrenceRule: (id: string) => write(() => repo.deleteRecurrenceRule(id)),
  /** Makes any records that recurrence rules say are due; returns how many. */
  runRecurrences: (todayISO: string) => write(() => repo.runRecurrences(todayISO)),

  setSetting: (key: string, value: unknown) => write(() => repo.setSetting(key, value)),
  setSettings: (entries: Record<string, unknown>) => write(() => repo.setSettings(entries)),
  resetAllData: () => write(() => repo.resetAllData()),
};

export function getState(): StoreState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Test hook: forget everything so the next startStore() reloads from scratch. */
export function resetStoreForTests(): void {
  state = INITIAL;
  started = null;
  queue = Promise.resolve();
  listeners.clear();
}

// -------------------------------------------------------------- selectors

export const fieldsOf = (s: StoreState, drawerId: string) => s.fields.filter((f) => f.drawerId === drawerId);
export const recordsOf = (s: StoreState, drawerId: string) => s.records.filter((r) => r.drawerId === drawerId);
export const drawerById = (s: StoreState, id: string) => s.drawers.find((d) => d.id === id);

export function useStore(): StoreState {
  const snapshot = useSyncExternalStore(subscribe, getState, getState);
  // Kick off loading the first time any component reads the store.
  if (snapshot.status === 'loading') void startStore();
  return snapshot;
}
