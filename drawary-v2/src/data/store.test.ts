import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { DB_NAME, closeDB } from './db';
import { actions, drawerById, fieldsOf, getState, recordsOf, resetStoreForTests, startStore, subscribe } from './store';
import { ValidationError } from './validation';

beforeEach(async () => {
  resetStoreForTests();
  await closeDB();
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase(DB_NAME);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
});

const drawerInput = (name: string) => ({ name, iconKey: 'cosmetics', colorKey: 'pink' });

describe('store', () => {
  it('starts in loading, becomes ready and empty on a brand-new install', async () => {
    expect(getState().status).toBe('loading');
    await startStore();
    expect(getState()).toMatchObject({ status: 'ready', error: null, drawers: [], records: [] });
  });

  it('reflects a write only after it is saved, and notifies subscribers', async () => {
    let notified = 0;
    const unsubscribe = subscribe(() => { notified++; });
    const drawer = await actions.createDrawer(drawerInput('화장품'));
    expect(getState().drawers.map((d) => d.id)).toEqual([drawer.id]);
    expect(notified).toBeGreaterThan(0);

    unsubscribe();
    const before = notified;
    await actions.createDrawer(drawerInput('책'));
    expect(notified).toBe(before);
  });

  it('what is on screen is what a fresh app launch would load', async () => {
    const d = await actions.createDrawer(drawerInput('화장품'));
    const f = await actions.addField(d.id, { name: '제품명', kind: 'text' });
    const r = await actions.createRecord(d.id, { [f.id]: '립 틴트' });

    // Simulate closing and reopening the app.
    resetStoreForTests();
    await closeDB();
    await startStore();

    const s = getState();
    expect(drawerById(s, d.id)?.name).toBe('화장품');
    expect(fieldsOf(s, d.id).map((x) => x.name)).toEqual(['제품명']);
    expect(recordsOf(s, d.id).map((x) => x.id)).toEqual([r.id]);
  });

  it('two taps at once both land, in order, without clobbering each other', async () => {
    const [a, b] = await Promise.all([
      actions.createDrawer(drawerInput('가')),
      actions.createDrawer(drawerInput('나')),
    ]);
    expect([a.order, b.order]).toEqual([0, 1]);
    expect(getState().drawers.map((d) => d.name)).toEqual(['가', '나']);
  });

  it('a rejected write changes nothing and does not block the next write', async () => {
    await expect(actions.createDrawer(drawerInput('   '))).rejects.toBeInstanceOf(ValidationError);
    expect(getState().drawers).toHaveLength(0);

    const ok = await actions.createDrawer(drawerInput('정상'));
    expect(getState().drawers.map((d) => d.id)).toEqual([ok.id]);
  });

  it('deleting a drawer clears its fields and records from the mirror too', async () => {
    const d = await actions.createDrawer(drawerInput('지울 서랍'));
    const f = await actions.addField(d.id, { name: '이름', kind: 'text' });
    await actions.createRecord(d.id, { [f.id]: 'x' });

    await actions.deleteDrawer(d.id);

    expect(getState()).toMatchObject({ drawers: [], fields: [], records: [] });
  });

  it('keeps settings across a relaunch and clears them on reset', async () => {
    await actions.setSetting('language', 'ja');
    resetStoreForTests();
    await closeDB();
    await startStore();
    expect(getState().settings.language).toBe('ja');

    await actions.resetAllData();
    expect(getState().settings).toEqual({});
  });
});
