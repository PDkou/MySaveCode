import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { DB_NAME, closeDB } from '../data/db';
import { actions, getState, resetStoreForTests, startStore } from '../data/store';
import * as repo from '../data/repository';
import { BACKUP_FORMAT, BackupError, backupFileName, backupSettings, createBackup, readBackup, type Snapshot } from './backupFile';
import { buildZip } from './zip';

beforeEach(async () => {
  resetStoreForTests();
  await closeDB();
  await new Promise<void>((resolve, reject) => { const r = indexedDB.deleteDatabase(DB_NAME); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); });
  await startStore();
});

const bytesOf = async (b: Blob) => Array.from(new Uint8Array(await b.arrayBuffer()));
const photo = (bytes: number[], type = 'image/jpeg') => new Blob([new Uint8Array(bytes)], { type });

async function seed() {
  const a = await actions.createDrawerWithFields({ name: '화장품', iconKey: 'cosmetics', colorKey: 'pink' }, [
    { name: '제품명', kind: 'text', required: true }, { name: '사용기한', kind: 'date' }, { name: '가격', kind: 'currency' },
  ]);
  const b = await actions.createDrawerWithFields({ name: '식물', iconKey: 'plants', colorKey: 'green' }, [{ name: '이름', kind: 'text' }]);
  const r1 = await actions.createRecord(a.drawer.id, { [a.fields[0].id]: '선크림', [a.fields[1].id]: '2027-03-01', [a.fields[2].id]: 13000 }, [photo([1, 2, 3]), photo([9, 9], 'image/png')]);
  const r2 = await actions.createRecord(b.drawer.id, { [b.fields[0].id]: '몬스테라' });
  await actions.addNotificationRule(a.drawer.id, { fieldId: a.fields[1].id, daysBefore: 7, time: '09:00' });
  await actions.addRecurrenceRule(a.drawer.id, { fieldId: a.fields[1].id, targetRecordId: r1.id, targetLabel: '선크림', cycle: 'monthly', interval: 1, end: { kind: 'never' } }, '2026-10-20');
  await actions.setSetting('theme', 'coral');
  await actions.setSetting('notify.common', { defaultTime: '08:30', quietEnabled: false, quietStart: '22:00', quietEnd: '07:00' });
  await actions.setSetting(`tableview.${a.drawer.id}`, { sorts: [], filters: [], matchMode: 'and' });
  await actions.setSetting('security.pin', { v: 1, salt: 'x', hash: 'y', iterations: 1 });
  await actions.setSetting('security.appLock', true);
  return { a, b, r1, r2 };
}

const snapshotNow = async (): Promise<Snapshot> => ({ ...(await repo.loadAll()), photos: await repo.loadAllPhotos() });
const NOW = new Date(2026, 9, 5, 14, 58);

describe('backup file', () => {
  it('names the file by date and kind', () => {
    expect(backupFileName(NOW, true)).toBe('Drawary_Backup_2026-10-05.zip');
    expect(backupFileName(NOW, false)).toBe('Drawary_Backup_2026-10-05.json');
  });

  it('round-trips everything, photos included, and leaves the PIN and lock out', async () => {
    const { a, r1 } = await seed();
    const snap = await snapshotNow();
    const made = await createBackup(snap, true, NOW);
    expect(made.fileName).toBe('Drawary_Backup_2026-10-05.zip');
    expect(made.summary).toMatchObject({ drawers: 2, fields: 4, records: 2, photos: 2, includesPhotos: true, kind: 'zip' });
    const back = await readBackup(made.blob);
    expect(back.summary).toMatchObject({ drawers: 2, fields: 4, records: 2, photos: 2, includesPhotos: true, kind: 'zip', createdAt: NOW.getTime() });
    expect(back.snapshot.drawers).toEqual(snap.drawers);
    expect(back.snapshot.fields).toEqual(snap.fields);
    expect(back.snapshot.records).toEqual(snap.records);
    expect(back.snapshot.notificationRules).toEqual(snap.notificationRules);
    expect(back.snapshot.recurrenceRules).toEqual(snap.recurrenceRules);
    const ph = back.snapshot.photos.get(r1.id)!;
    expect(ph.map((p) => p.type)).toEqual(['image/jpeg', 'image/png']);
    expect(await bytesOf(ph[0])).toEqual([1, 2, 3]);
    expect(await bytesOf(ph[1])).toEqual([9, 9]);
    expect(Object.keys(back.snapshot.settings).sort()).toEqual(['notify.common', `tableview.${a.drawer.id}`, 'theme']);
  });

  it('without photos it is a plain .json with no photo files', async () => {
    await seed();
    const made = await createBackup(await snapshotNow(), false, NOW);
    expect(made.fileName).toBe('Drawary_Backup_2026-10-05.json');
    expect(made.blob.type).toBe('application/json');
    const doc = JSON.parse(await made.blob.text());
    expect(doc).toMatchObject({ app: 'drawary', format: BACKUP_FORMAT, includesPhotos: false });
    expect('photos' in doc).toBe(false);
    expect(JSON.stringify(doc)).not.toContain('security');
    const back = await readBackup(made.blob);
    expect(back.summary).toMatchObject({ includesPhotos: false, photos: 0, kind: 'json', records: 2 });
    expect(back.snapshot.photos.size).toBe(0);
  });

  it('only lets the right settings travel', () => {
    const s = backupSettings({ theme: 'sage', language: 'ja', 'notify.common': { a: 1 }, 'tableview.d1': { x: 1 }, 'tableview.gone': { x: 1 }, 'security.pin': { hash: 'h' }, theme2: 1, 'security.appLock': true }, new Set(['d1']));
    expect(s).toEqual({ theme: 'sage', language: 'ja', 'notify.common': { a: 1 }, 'tableview.d1': { x: 1 } });
    expect(backupSettings({ theme: 'neon', language: 'xx' }, new Set())).toEqual({});
  });
});

describe('restore', () => {
  it('replaces what is on the device, brings photos back, keeps this device\'s PIN and lock', async () => {
    const { r1 } = await seed();
    const made = await createBackup(await snapshotNow(), true, NOW);
    // another state on the device: different data and a different PIN
    await actions.resetAllData();
    await actions.createDrawer({ name: '남는 서랍', iconKey: 'misc', colorKey: 'pink' });
    await actions.setSetting('security.pin', { v: 1, salt: 'NEW', hash: 'NEW', iterations: 1 });
    await actions.setSetting('theme', 'sky');
    await actions.setSetting('somethingElse', 1);
    const parsed = await readBackup(made.blob);
    await actions.replaceAllData(parsed.snapshot);
    const st = getState();
    expect(st.drawers.map((d) => d.name).sort()).toEqual(['식물', '화장품']);
    expect(st.records).toHaveLength(2);
    expect(st.notificationRules).toHaveLength(1);
    expect(st.recurrenceRules).toHaveLength(1);
    expect(st.settings.theme).toBe('coral');
    expect(st.settings.somethingElse).toBeUndefined();
    expect((st.settings['security.pin'] as { salt: string }).salt).toBe('NEW');
    const photos = await repo.getPhotos(r1.id);
    expect(photos).toHaveLength(2);
    expect(await bytesOf(photos![0])).toEqual([1, 2, 3]);
  });

  it('changes nothing if writing fails half-way', async () => {
    await seed();
    const before = JSON.stringify((await repo.loadAll()));
    const broken = { drawers: [{ id: 'ok', name: 'x', iconKey: 'misc', colorKey: 'pink', order: 0, createdAt: 0, updatedAt: 0 }, { name: 'no id' } as never], fields: [], records: [], notificationRules: [], recurrenceRules: [], settings: {}, photos: new Map() };
    await expect(actions.replaceAllData(broken)).rejects.toThrow();
    expect(JSON.stringify(await repo.loadAll())).toBe(before);
    expect(await repo.loadAllPhotos().then((m) => m.size)).toBe(1);
  });
});

describe('reading a file that is not (or not quite) a backup', () => {
  const file = (obj: unknown) => new Blob([typeof obj === 'string' ? obj : JSON.stringify(obj)], { type: 'application/json' });
  const base = () => ({
    app: 'drawary', format: 1, createdAt: '2026-10-05T05:58:00.000Z', includesPhotos: false,
    drawers: [{ id: 'd1', name: 'A', iconKey: 'misc', colorKey: 'pink', order: 0, createdAt: 1, updatedAt: 1 }],
    fields: [{ id: 'f1', drawerId: 'd1', name: 'N', kind: 'text', required: false, options: [], order: 0 }, { id: 'f2', drawerId: 'd1', name: 'D', kind: 'date', required: false, options: [], order: 1 }],
    records: [{ id: 'r1', drawerId: 'd1', values: { f1: 'x' }, createdAt: 1, updatedAt: 1 }],
    notificationRules: [], recurrenceRules: [], settings: {},
  });
  const rejects = async (b: Blob, msg?: RegExp) => { const p = readBackup(b); await expect(p).rejects.toBeInstanceOf(BackupError); if (msg) await expect(p).rejects.toThrow(msg); };

  it('accepts the minimal valid file', async () => {
    const r = await readBackup(file(base()));
    expect(r.summary).toMatchObject({ drawers: 1, fields: 2, records: 1, photos: 0 });
  });

  it('refuses text that is not JSON, JSON of another app, and a newer format', async () => {
    await rejects(file('this is not json'), /Drawary 백업 파일이 아니에요/);
    await rejects(file({ hello: 1 }), /Drawary 백업 파일이 아니에요/);
    await rejects(file({ ...base(), format: BACKUP_FORMAT + 1 }), /더 새로운 버전/);
    await rejects(file([1, 2]), /Drawary 백업 파일이 아니에요/);
  });

  it('refuses a damaged zip, and a zip without backup.json', async () => {
    const zip = buildZip([{ name: 'backup.json', data: new TextEncoder().encode(JSON.stringify(base())) }]);
    const cut = zip.slice(0, zip.length - 10);
    await rejects(new Blob([cut as BlobPart]), /손상/);
    const other = buildZip([{ name: 'readme.txt', data: new TextEncoder().encode('hi') }]);
    await rejects(new Blob([other as BlobPart]), /Drawary 백업 파일이 아니에요/);
  });

  it('refuses broken structure: duplicate ids, unknown drawers, bad kinds, wrong types', async () => {
    const dup = base(); dup.records.push({ ...dup.records[0] });
    await rejects(file(dup), /손상/);
    const orphan = base(); orphan.fields[0].drawerId = 'nope';
    await rejects(file(orphan), /손상/);
    const kind = base(); (kind.fields[0] as { kind: string }).kind = 'weird';
    await rejects(file(kind), /손상/);
    const typed = base(); (typed.drawers[0] as { order: unknown }).order = 'first';
    await rejects(file(typed), /손상/);
    const noList = base(); (noList as { records: unknown }).records = {};
    await rejects(file(noList), /손상/);
  });

  it('drops what points at nothing instead of failing: values of unknown fields, rules without their date field, unknown settings', async () => {
    const d = base() as ReturnType<typeof base> & Record<string, unknown>;
    d.records[0].values = { f1: 'x', ghost: 'y', f2: '2027-01-01', bad: { o: 1 } } as never;
    d.notificationRules = [
      { id: 'n1', drawerId: 'd1', fieldId: 'f2', daysBefore: 3, time: '09:00', createdAt: 1 },
      { id: 'n2', drawerId: 'd1', fieldId: 'f1', daysBefore: 3, time: '09:00', createdAt: 1 },   // not a date field
      { id: 'n3', drawerId: 'd1', fieldId: 'f2', daysBefore: 999, time: '09:00', createdAt: 1 }, // out of range
      { id: 'n4', drawerId: 'd1', fieldId: 'f2', daysBefore: 1, time: '25:00', createdAt: 1 },   // not a time
    ] as never;
    d.settings = { theme: 'lavender', 'security.pin': { hash: 'x' }, junk: 1 };
    const r = await readBackup(file(d));
    expect(r.snapshot.records[0].values).toEqual({ f1: 'x', f2: '2027-01-01' });
    expect(r.snapshot.notificationRules.map((n) => n.id)).toEqual(['n1']);
    expect(r.snapshot.settings).toEqual({ theme: 'lavender' });
  });

  it('keeps at most 3 photos per record, ignores photos of unknown records, and refuses a listed photo that is missing', async () => {
    const d = { ...base(), includesPhotos: true, photos: {
      r1: [1, 2, 3, 4].map((i) => ({ file: `photos/r1/${i}.jpg`, type: 'image/jpeg' })),
      ghost: [{ file: 'photos/ghost/1.jpg', type: 'image/jpeg' }],
    } };
    const entries = (names: string[]) => [{ name: 'backup.json', data: new TextEncoder().encode(JSON.stringify(d)) }, ...names.map((n, i) => ({ name: n, data: new Uint8Array([i]) }))];
    const ok = await readBackup(new Blob([buildZip(entries(['photos/r1/1.jpg', 'photos/r1/2.jpg', 'photos/r1/3.jpg', 'photos/r1/4.jpg'])) as BlobPart]));
    expect(ok.snapshot.photos.get('r1')).toHaveLength(3);
    expect(ok.snapshot.photos.has('ghost')).toBe(false);
    expect(ok.summary.photos).toBe(3);
    await rejects(new Blob([buildZip(entries(['photos/r1/1.jpg'])) as BlobPart]), /손상/);
    const notImage = { ...d, photos: { r1: [{ file: 'photos/r1/1.jpg', type: 'text/html' }] } };
    await rejects(new Blob([buildZip([{ name: 'backup.json', data: new TextEncoder().encode(JSON.stringify(notImage)) }, { name: 'photos/r1/1.jpg', data: new Uint8Array([1]) }]) as BlobPart]), /손상/);
  });
});
