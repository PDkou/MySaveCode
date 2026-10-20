import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { DB_NAME, DB_VERSION, STORES, closeDB, openDB } from './db';
import {
  addNotificationRule, addRecurrenceRule, deleteNotificationRule, deleteRecurrenceRule, runRecurrences,
  addField, createDrawer, createDrawerWithFields, createRecord, deleteDrawer, deleteField, deleteRecord, getPhotos,
  getSetting, loadAll, reorderDrawers, reorderFields, resetAllData, setPhotos, setSetting,
  updateDrawer, updateField, updateRecord,
} from './repository';
import { ValidationError } from './validation';

const png = () => new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });

async function freshDB() {
  await closeDB();
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase(DB_NAME);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

async function makeDrawer(name = '화장품') {
  return createDrawer({ name, iconKey: 'cosmetics', colorKey: 'pink' });
}

beforeEach(freshDB);

describe('schema', () => {
  it('creates every store on first open', async () => {
    const db = await openDB();
    expect(db.version).toBe(DB_VERSION);
    for (const name of Object.values(STORES)) expect(db.objectStoreNames.contains(name)).toBe(true);
  });
});

describe('drawers', () => {
  it('trims names, orders them, and survives closing and reopening the database', async () => {
    const a = await makeDrawer('  화장품  ');
    const b = await makeDrawer('책');
    expect(a.name).toBe('화장품');
    expect(b.order).toBe(a.order + 1);

    await closeDB();
    const snap = await loadAll();
    expect(snap.drawers.map((d) => d.name)).toEqual(['화장품', '책']);
  });

  it('rejects empty and over-long names without writing anything', async () => {
    await expect(makeDrawer('   ')).rejects.toBeInstanceOf(ValidationError);
    await expect(makeDrawer('가'.repeat(21))).rejects.toThrow('20자');
    expect((await loadAll()).drawers).toHaveLength(0);
  });

  it('updates name, icon and color and bumps updatedAt', async () => {
    const d = await makeDrawer();
    await new Promise((r) => setTimeout(r, 5));
    const next = await updateDrawer(d.id, { name: '뷰티', iconKey: 'books', colorKey: 'blue' });
    expect(next).toMatchObject({ name: '뷰티', iconKey: 'books', colorKey: 'blue', createdAt: d.createdAt });
    expect(next.updatedAt).toBeGreaterThan(d.updatedAt);
    await expect(updateDrawer('missing', { name: 'x' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('reorders only with a complete, duplicate-free id list', async () => {
    const a = await makeDrawer('가');
    const b = await makeDrawer('나');
    const c = await makeDrawer('다');
    await reorderDrawers([c.id, a.id, b.id]);
    expect((await loadAll()).drawers.map((d) => d.name)).toEqual(['다', '가', '나']);

    await expect(reorderDrawers([a.id, b.id])).rejects.toBeInstanceOf(ValidationError);
    await expect(reorderDrawers([a.id, a.id, b.id])).rejects.toBeInstanceOf(ValidationError);
    expect((await loadAll()).drawers.map((d) => d.name)).toEqual(['다', '가', '나']);
  });

  it('deleting a drawer removes its fields, records and photos but leaves other drawers alone', async () => {
    const keep = await makeDrawer('남길 서랍');
    const gone = await makeDrawer('지울 서랍');
    const keepField = await addField(keep.id, { name: '이름', kind: 'text' });
    const goneField = await addField(gone.id, { name: '이름', kind: 'text' });
    const keepRec = await createRecord(keep.id, { [keepField.id]: 'a' });
    const goneRec = await createRecord(gone.id, { [goneField.id]: 'b' });
    await setPhotos(keepRec.id, [png()]);
    await setPhotos(goneRec.id, [png()]);

    await deleteDrawer(gone.id);

    const snap = await loadAll();
    expect(snap.drawers.map((d) => d.id)).toEqual([keep.id]);
    expect(snap.fields.map((f) => f.id)).toEqual([keepField.id]);
    expect(snap.records.map((r) => r.id)).toEqual([keepRec.id]);
    expect(await getPhotos(goneRec.id)).toBeNull();
    expect(await getPhotos(keepRec.id)).toHaveLength(1);
  });
});

describe('fields', () => {
  it('appends in order and requires at least two options for a select field', async () => {
    const d = await makeDrawer();
    const f1 = await addField(d.id, { name: '제품명', kind: 'text', required: true });
    const f2 = await addField(d.id, { name: '구매일', kind: 'date' });
    expect([f1.order, f2.order]).toEqual([0, 1]);
    expect(f1.required).toBe(true);

    await expect(addField(d.id, { name: '색상', kind: 'select', options: ['빨강'] })).rejects.toThrow('2개 이상');
    const sel = await addField(d.id, { name: '색상', kind: 'select', options: [' 빨강 ', '파랑', ''] });
    expect(sel.options).toEqual(['빨강', '파랑']);
    await expect(addField('missing', { name: 'x', kind: 'text' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('keeps the kind fixed on update and still enforces select options', async () => {
    const d = await makeDrawer();
    const f = await addField(d.id, { name: '메모', kind: 'text' });
    const renamed = await updateField(f.id, { name: '한줄평', required: true });
    expect(renamed).toMatchObject({ name: '한줄평', required: true, kind: 'text' });

    const sel = await addField(d.id, { name: '색상', kind: 'select', options: ['a', 'b'] });
    await expect(updateField(sel.id, { options: ['only'] })).rejects.toThrow('2개 이상');
  });

  it('reorders fields within a drawer', async () => {
    const d = await makeDrawer();
    const a = await addField(d.id, { name: 'A', kind: 'text' });
    const b = await addField(d.id, { name: 'B', kind: 'text' });
    await reorderFields(d.id, [b.id, a.id]);
    expect((await loadAll()).fields.map((f) => f.name)).toEqual(['B', 'A']);
    await expect(reorderFields(d.id, [a.id])).rejects.toBeInstanceOf(ValidationError);
  });

  it('deleting a field strips its value from every record in that drawer only', async () => {
    const d = await makeDrawer();
    const other = await makeDrawer('다른 서랍');
    const name = await addField(d.id, { name: '이름', kind: 'text' });
    const memo = await addField(d.id, { name: '메모', kind: 'text' });
    const r1 = await createRecord(d.id, { [name.id]: 'n1', [memo.id]: 'm1' });
    const otherField = await addField(other.id, { name: '메모', kind: 'text' });
    const r2 = await createRecord(other.id, { [otherField.id]: 'untouched' });

    await deleteField(memo.id);

    const snap = await loadAll();
    expect(snap.records.find((r) => r.id === r1.id)!.values).toEqual({ [name.id]: 'n1' });
    expect(snap.records.find((r) => r.id === r2.id)!.values).toEqual({ [otherField.id]: 'untouched' });
    expect(snap.fields.map((f) => f.id)).not.toContain(memo.id);
  });
});

describe('creating a drawer with its fields', () => {
  it('writes the drawer and every field together, in order', async () => {
    const { drawer, fields } = await createDrawerWithFields(
      { name: ' 책 ', iconKey: 'books', colorKey: 'lavender' },
      [{ name: '제목', kind: 'text', required: true }, { name: '읽은 날', kind: 'date' }, { name: '분류', kind: 'select', options: ['소설', '시'] }],
    );
    expect(drawer.name).toBe('책');
    expect(fields.map((f) => [f.name, f.order])).toEqual([['제목', 0], ['읽은 날', 1], ['분류', 2]]);
    const snap = await loadAll();
    expect(snap.drawers).toHaveLength(1);
    expect(snap.fields.map((f) => f.drawerId)).toEqual([drawer.id, drawer.id, drawer.id]);
  });

  it('leaves nothing behind when any field is invalid, or there are no fields', async () => {
    const input = { name: '책', iconKey: 'books', colorKey: 'lavender' };
    await expect(createDrawerWithFields(input, [])).rejects.toBeInstanceOf(ValidationError);
    await expect(createDrawerWithFields(input, [{ name: '제목', kind: 'text' }, { name: '분류', kind: 'select', options: ['하나'] }])).rejects.toBeInstanceOf(ValidationError);
    await expect(createDrawerWithFields(input, [{ name: '제목', kind: 'text' }, { name: ' 제목 ', kind: 'text' }])).rejects.toBeInstanceOf(ValidationError);
    await expect(createDrawerWithFields({ ...input, name: '  ' }, [{ name: '제목', kind: 'text' }])).rejects.toBeInstanceOf(ValidationError);
    const snap = await loadAll();
    expect(snap.drawers).toHaveLength(0);
    expect(snap.fields).toHaveLength(0);
  });

  it('rejects a field name already used in the same drawer (also on rename), but allows it in another drawer', async () => {
    const a = await makeDrawer('A');
    const b = await makeDrawer('B');
    const f = await addField(a.id, { name: '메모', kind: 'text' });
    await addField(a.id, { name: '가격', kind: 'currency' });
    await expect(addField(a.id, { name: '메모', kind: 'long_text' })).rejects.toBeInstanceOf(ValidationError);
    await expect(updateField(f.id, { name: '가격' })).rejects.toBeInstanceOf(ValidationError);
    await expect(updateField(f.id, { name: '메모', required: true })).resolves.toMatchObject({ required: true });
    await expect(addField(b.id, { name: '메모', kind: 'text' })).resolves.toBeTruthy();
  });

  it('rejects repeated select options', async () => {
    const a = await makeDrawer();
    await expect(addField(a.id, { name: '분류', kind: 'select', options: ['가', '가'] })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('records', () => {
  async function setup() {
    const d = await makeDrawer();
    const name = await addField(d.id, { name: '제품명', kind: 'text', required: true });
    const date = await addField(d.id, { name: '구매일', kind: 'date' });
    const price = await addField(d.id, { name: '가격', kind: 'currency' });
    const color = await addField(d.id, { name: '색상', kind: 'select', options: ['빨강', '파랑'] });
    const done = await addField(d.id, { name: '완료', kind: 'check', required: true });
    const stars = await addField(d.id, { name: '별점', kind: 'rating' });
    return { d, name, date, price, color, done, stars };
  }

  it('stores a valid record and an unchecked required checkbox counts as answered', async () => {
    const { d, name, date, price, color, done, stars } = await setup();
    const r = await createRecord(d.id, {
      [name.id]: '립 틴트', [date.id]: '2024-03-12', [price.id]: 13000,
      [color.id]: '빨강', [done.id]: false, [stars.id]: 4,
    });
    await closeDB();
    const stored = (await loadAll()).records.find((x) => x.id === r.id)!;
    expect(stored.values[price.id]).toBe(13000);
    expect(stored.values[done.id]).toBe(false);
  });

  it.each([
    ['missing required text', (f: Awaited<ReturnType<typeof setup>>) => ({ [f.done.id]: false })],
    ['impossible date', (f: Awaited<ReturnType<typeof setup>>) => ({ [f.name.id]: 'x', [f.done.id]: false, [f.date.id]: '2024-02-31' })],
    ['fractional currency', (f: Awaited<ReturnType<typeof setup>>) => ({ [f.name.id]: 'x', [f.done.id]: false, [f.price.id]: 1.5 })],
    ['text where a number belongs', (f: Awaited<ReturnType<typeof setup>>) => ({ [f.name.id]: 'x', [f.done.id]: false, [f.price.id]: '비싸요' })],
    ['select value not in options', (f: Awaited<ReturnType<typeof setup>>) => ({ [f.name.id]: 'x', [f.done.id]: false, [f.color.id]: '초록' })],
    ['rating out of range', (f: Awaited<ReturnType<typeof setup>>) => ({ [f.name.id]: 'x', [f.done.id]: false, [f.stars.id]: 6 })],
    ['unknown field id', (f: Awaited<ReturnType<typeof setup>>) => ({ [f.name.id]: 'x', [f.done.id]: false, nope: 'y' })],
  ])('rejects %s and writes nothing', async (_label, build) => {
    const fx = await setup();
    await expect(createRecord(fx.d.id, build(fx) as never)).rejects.toBeInstanceOf(ValidationError);
    expect((await loadAll()).records).toHaveLength(0);
  });

  it('update replaces values wholesale and refuses invalid data, keeping the old record', async () => {
    const { d, name, done, price } = await setup();
    const r = await createRecord(d.id, { [name.id]: '원본', [done.id]: false, [price.id]: 100 });
    const next = await updateRecord(r.id, { [name.id]: '수정본', [done.id]: true });
    expect(next.values).toEqual({ [name.id]: '수정본', [done.id]: true });
    expect(next.createdAt).toBe(r.createdAt);

    await expect(updateRecord(r.id, { [done.id]: true })).rejects.toBeInstanceOf(ValidationError);
    expect((await loadAll()).records[0].values[name.id]).toBe('수정본');
    await expect(updateRecord('missing', {})).rejects.toBeInstanceOf(ValidationError);
  });

  it('lists newest records first and deleting one removes its photos', async () => {
    const { d, name, done } = await setup();
    const a = await createRecord(d.id, { [name.id]: 'a', [done.id]: false });
    await new Promise((r) => setTimeout(r, 5));
    const b = await createRecord(d.id, { [name.id]: 'b', [done.id]: false });
    expect((await loadAll()).records.map((r) => r.id)).toEqual([b.id, a.id]);

    await setPhotos(a.id, [png()]);
    await deleteRecord(a.id);
    expect(await getPhotos(a.id)).toBeNull();
    expect((await loadAll()).records.map((r) => r.id)).toEqual([b.id]);
  });
});

describe('editing the fields of an existing drawer', () => {
  it('clears a record value whose choice is taken away, and leaves the others', async () => {
    const d = await makeDrawer();
    const cat = await addField(d.id, { name: '분류', kind: 'select', options: ['가', '나', '다'] });
    const a = await createRecord(d.id, { [cat.id]: '가' });
    const b = await createRecord(d.id, { [cat.id]: '나' });
    await updateField(cat.id, { options: ['나', '다'] });
    const after = (await loadAll()).records;
    expect(after.find((r) => r.id === a.id)!.values[cat.id]).toBeUndefined();
    expect(after.find((r) => r.id === b.id)!.values[cat.id]).toBe('나');
    expect((await loadAll()).fields[0].options).toEqual(['나', '다']);
  });

  it('keeps record values untouched when the update itself is rejected', async () => {
    const d = await makeDrawer();
    const cat = await addField(d.id, { name: '분류', kind: 'select', options: ['가', '나'] });
    const r = await createRecord(d.id, { [cat.id]: '가' });
    await expect(updateField(cat.id, { options: ['나'] })).rejects.toBeInstanceOf(ValidationError);
    expect((await loadAll()).records.find((x) => x.id === r.id)!.values[cat.id]).toBe('가');
  });

  it('refuses to delete the last remaining field of a drawer', async () => {
    const d = await makeDrawer();
    const a = await addField(d.id, { name: '제품명', kind: 'text' });
    const b = await addField(d.id, { name: '메모', kind: 'text' });
    await deleteField(b.id);
    await expect(deleteField(a.id)).rejects.toBeInstanceOf(ValidationError);
    expect((await loadAll()).fields).toHaveLength(1);
  });
});

describe('a drawer\'s saved table view', () => {
  it('is removed together with the drawer', async () => {
    const a = await makeDrawer('A'); const b = await makeDrawer('B');
    await setSetting(`tableview.${a.id}`, { sort: null, rules: [], matchMode: 'all' });
    await setSetting(`tableview.${b.id}`, { sort: null, rules: [], matchMode: 'any' });
    await deleteDrawer(a.id);
    expect(await getSetting(`tableview.${a.id}`)).toBeUndefined();
    expect(await getSetting(`tableview.${b.id}`)).toBeTruthy();
  });
});

describe('records saved together with their photos', () => {
  it('creates a record and its photos atomically, and writes nothing for a bad photo', async () => {
    const d = await makeDrawer(); const name = await addField(d.id, { name: '제품명', kind: 'text', required: true });
    const rec = await createRecord(d.id, { [name.id]: '립' }, [png(), png()]);
    expect((await getPhotos(rec.id))?.length).toBe(2);
    const plain = await createRecord(d.id, { [name.id]: '쿠션' });
    expect(await getPhotos(plain.id)).toBeNull();
    const before = (await loadAll()).records.length;
    await expect(createRecord(d.id, { [name.id]: '향수' }, [new Blob(['x'], { type: 'text/plain' })])).rejects.toBeInstanceOf(ValidationError);
    await expect(createRecord(d.id, { [name.id]: '향수' }, [png(), png(), png(), png()])).rejects.toBeInstanceOf(ValidationError);
    await expect(createRecord(d.id, {}, [png()])).rejects.toBeInstanceOf(ValidationError);
    expect((await loadAll()).records.length).toBe(before);
  });

  it('updates values with photos left alone, replaced, or cleared, never half-applied', async () => {
    const d = await makeDrawer(); const name = await addField(d.id, { name: '제품명', kind: 'text', required: true });
    const rec = await createRecord(d.id, { [name.id]: '립' }, [png()]);
    await updateRecord(rec.id, { [name.id]: '립2' });
    expect((await getPhotos(rec.id))?.length).toBe(1);
    await updateRecord(rec.id, { [name.id]: '립3' }, [png(), png()]);
    expect((await getPhotos(rec.id))?.length).toBe(2);
    await updateRecord(rec.id, { [name.id]: '립4' }, []);
    expect(await getPhotos(rec.id)).toEqual([]);
    await expect(updateRecord(rec.id, {}, [png()])).rejects.toBeInstanceOf(ValidationError); // required name missing
    const after = (await loadAll()).records.find((r) => r.id === rec.id)!;
    expect(after.values[name.id]).toBe('립4');
    expect(await getPhotos(rec.id)).toEqual([]);
  });
});

describe('photos', () => {
  async function recordId() {
    const d = await makeDrawer();
    const f = await addField(d.id, { name: '이름', kind: 'text' });
    return (await createRecord(d.id, { [f.id]: 'x' })).id;
  }

  it('distinguishes never-set (null) from explicitly cleared ([])', async () => {
    const id = await recordId();
    expect(await getPhotos(id)).toBeNull();
    await setPhotos(id, [png(), png()]);
    expect(await getPhotos(id)).toHaveLength(2);
    await setPhotos(id, []);
    expect(await getPhotos(id)).toEqual([]);
  });

  it('enforces the 3-photo limit, image-only files, and an existing record', async () => {
    const id = await recordId();
    await expect(setPhotos(id, [png(), png(), png(), png()])).rejects.toThrow('최대 3장');
    await expect(setPhotos(id, [new Blob(['x'], { type: 'text/plain' })])).rejects.toThrow('이미지');
    await expect(setPhotos('missing', [png()])).rejects.toBeInstanceOf(ValidationError);
    expect(await getPhotos(id)).toBeNull();
  });
});

describe('settings and reset', () => {
  it('round-trips arbitrary setting values', async () => {
    expect(await getSetting('language')).toBeUndefined();
    await setSetting('language', 'ja');
    await setSetting('appLock', { enabled: true });
    expect(await getSetting('language')).toBe('ja');
    expect((await loadAll()).settings).toEqual({ language: 'ja', appLock: { enabled: true } });
  });

  it('resetAllData empties every store', async () => {
    const d = await makeDrawer();
    const f = await addField(d.id, { name: '이름', kind: 'text' });
    const r = await createRecord(d.id, { [f.id]: 'x' });
    await setPhotos(r.id, [png()]);
    await setSetting('language', 'en');
    const dateField = await addField(d.id, { name: '구매일', kind: 'date' });
    await addNotificationRule(d.id, { fieldId: dateField.id, daysBefore: 7, time: '09:00' });
    const dated = await createRecord(d.id, { [f.id]: 'y', [dateField.id]: '2024-03-12' });
    await addRecurrenceRule(d.id, { targetRecordId: dated.id, fieldId: dateField.id, cycle: 'monthly', interval: 1, end: { kind: 'never' }, targetLabel: 'y' }, '2024-04-01');

    await resetAllData();

    expect(await loadAll()).toEqual({ drawers: [], fields: [], records: [], notificationRules: [], recurrenceRules: [], settings: {} });
    expect(await getPhotos(r.id)).toBeNull();
  });
});


describe('upgrading from the first database version', () => {
  it('keeps existing data and adds the notification and recurrence stores', async () => {
    await closeDB();
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.deleteDatabase(DB_NAME); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error);
    });
    // A database exactly as version 1 left it, with one drawer in it.
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open(DB_NAME, 1);
      open.onupgradeneeded = () => {
        const db = open.result;
        db.createObjectStore('drawers', { keyPath: 'id' });
        db.createObjectStore('fields', { keyPath: 'id' }).createIndex('drawerId', 'drawerId');
        db.createObjectStore('records', { keyPath: 'id' }).createIndex('drawerId', 'drawerId');
        db.createObjectStore('photos', { keyPath: 'recordId' });
        db.createObjectStore('settings', { keyPath: 'key' });
      };
      open.onsuccess = () => {
        const tx = open.result.transaction('drawers', 'readwrite');
        tx.objectStore('drawers').add({ id: 'old', name: '옛 서랍', iconKey: 'books', colorKey: 'pink', order: 0, createdAt: 1, updatedAt: 1 });
        tx.oncomplete = () => { open.result.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      open.onerror = () => reject(open.error);
    });
    const snap = await loadAll();
    expect(snap.drawers.map((d) => d.name)).toEqual(['옛 서랍']);
    expect(snap.notificationRules).toEqual([]);
    expect(snap.recurrenceRules).toEqual([]);
    const db = await openDB();
    expect(db.version).toBe(DB_VERSION);
    expect(DB_VERSION).toBeGreaterThanOrEqual(2);
  });
});

describe('notification rules', () => {
  async function setup() {
    const { drawer, fields } = await createDrawerWithFields({ name: '화장품', iconKey: 'cosmetics', colorKey: 'pink' }, [
      { name: '제품명', kind: 'text' }, { name: '구매일', kind: 'date' }, { name: '가격', kind: 'currency' },
    ]);
    return { drawer, name: fields[0], date: fields[1], price: fields[2] };
  }

  it('stores "N days before at this time" for a date field, and refuses the same rule twice', async () => {
    const { drawer, date } = await setup();
    const rule = await addNotificationRule(drawer.id, { fieldId: date.id, daysBefore: 7, time: '09:00' });
    expect((await loadAll()).notificationRules).toEqual([rule]);
    await expect(addNotificationRule(drawer.id, { fieldId: date.id, daysBefore: 7, time: '09:00' })).rejects.toThrow('이미');
    await expect(addNotificationRule(drawer.id, { fieldId: date.id, daysBefore: 0, time: '09:00' })).resolves.toBeTruthy();
    await deleteNotificationRule(rule.id);
    expect((await loadAll()).notificationRules).toHaveLength(1);
  });

  it('only accepts a date field of that drawer, a sane time and 0-90 days', async () => {
    const { drawer, name, price } = await setup();
    const other = await makeDrawer('다른 서랍'); const otherDate = await addField(other.id, { name: '날', kind: 'date' });
    await expect(addNotificationRule(drawer.id, { fieldId: name.id, daysBefore: 1, time: '09:00' })).rejects.toBeInstanceOf(ValidationError);
    await expect(addNotificationRule(drawer.id, { fieldId: price.id, daysBefore: 1, time: '09:00' })).rejects.toBeInstanceOf(ValidationError);
    await expect(addNotificationRule(drawer.id, { fieldId: otherDate.id, daysBefore: 1, time: '09:00' })).rejects.toBeInstanceOf(ValidationError);
    const date = (await loadAll()).fields.find((f) => f.drawerId === drawer.id && f.kind === 'date')!;
    for (const bad of [{ daysBefore: -1, time: '09:00' }, { daysBefore: 91, time: '09:00' }, { daysBefore: 1.5, time: '09:00' }, { daysBefore: 1, time: '24:00' }, { daysBefore: 1, time: '9:00' }]) {
      await expect(addNotificationRule(drawer.id, { fieldId: date.id, ...bad })).rejects.toBeInstanceOf(ValidationError);
    }
  });

  it('is removed with its date field or its drawer, and nothing else', async () => {
    const { drawer, date } = await setup();
    const extra = await addField(drawer.id, { name: '만료일', kind: 'date' });
    await addNotificationRule(drawer.id, { fieldId: date.id, daysBefore: 7, time: '09:00' });
    await addNotificationRule(drawer.id, { fieldId: extra.id, daysBefore: 1, time: '10:00' });
    await deleteField(date.id);
    expect((await loadAll()).notificationRules.map((n) => n.fieldId)).toEqual([extra.id]);
    await deleteDrawer(drawer.id);
    expect((await loadAll()).notificationRules).toEqual([]);
  });
});

describe('recurrence rules make NEW records and never touch the original', () => {
  async function setup() {
    const { drawer, fields } = await createDrawerWithFields({ name: '화장품', iconKey: 'cosmetics', colorKey: 'pink' }, [
      { name: '제품명', kind: 'text', required: true }, { name: '구매일', kind: 'date' }, { name: '가격', kind: 'currency' },
    ]);
    const [name, date, price] = fields;
    const original = await createRecord(drawer.id, { [name.id]: '선크림', [date.id]: '2026-08-15', [price.id]: 15000 }, [png()]);
    const input = (over = {}) => ({ targetRecordId: original.id, fieldId: date.id, cycle: 'monthly' as const, interval: 1, end: { kind: 'never' as const }, targetLabel: '선크림', ...over });
    return { drawer, name, date, price, original, input };
  }
  const records = async (drawerId: string) => (await loadAll()).records.filter((r) => r.drawerId === drawerId);

  it('creates nothing when the rule is added and only counts periods after today', async () => {
    const { drawer, input } = await setup();
    const rule = await addRecurrenceRule(drawer.id, input(), '2026-10-20');
    expect(rule.startIndex).toBe(3); // 2026-09-15 and 2026-10-15 are history, 2026-11-15 is the first
    expect(rule.createdCount).toBe(0);
    expect(await records(drawer.id)).toHaveLength(1);
  });

  it('makes a new record when a period arrives, copying the others and leaving the original and its photos alone', async () => {
    const { drawer, name, date, price, original, input } = await setup();
    await addRecurrenceRule(drawer.id, input(), '2026-10-20');
    expect(await runRecurrences('2026-11-14')).toBe(0);
    expect(await runRecurrences('2026-11-15')).toBe(1);
    const all = await records(drawer.id);
    expect(all).toHaveLength(2);
    const made = all.find((r) => r.id !== original.id)!;
    expect(made.values).toEqual({ [name.id]: '선크림', [date.id]: '2026-11-15', [price.id]: 15000 });
    const same = all.find((r) => r.id === original.id)!;
    expect(same.values[date.id]).toBe('2026-08-15');
    expect(same.updatedAt).toBe(original.updatedAt);
    expect(await getPhotos(made.id)).toBeNull();
    expect((await getPhotos(original.id))?.length).toBe(1);
  });

  it('is idempotent: running again the same day, or twice at once, never repeats a period', async () => {
    const { drawer, input } = await setup();
    await addRecurrenceRule(drawer.id, input(), '2026-10-20');
    await Promise.all([runRecurrences('2026-11-15'), runRecurrences('2026-11-15')]);
    expect(await runRecurrences('2026-11-15')).toBe(0);
    expect(await records(drawer.id)).toHaveLength(2);
  });

  it('catches up after a long absence, in order, without making the periods before the rule existed', async () => {
    const { drawer, date, input } = await setup();
    await addRecurrenceRule(drawer.id, input(), '2026-10-20');
    expect(await runRecurrences('2027-02-20')).toBe(4); // Nov 15, Dec 15, Jan 15, Feb 15
    const dates = (await records(drawer.id)).map((r) => r.values[date.id]).sort();
    expect(dates).toEqual(['2026-08-15', '2026-11-15', '2026-12-15', '2027-01-15', '2027-02-15']);
  });

  it('stops after the chosen number of NEW records (the original does not count)', async () => {
    const { drawer, input } = await setup();
    const rule = await addRecurrenceRule(drawer.id, input({ end: { kind: 'count', count: 2 } }), '2026-10-20');
    expect(await runRecurrences('2030-01-01')).toBe(2);
    expect(await records(drawer.id)).toHaveLength(3);
    const after = (await loadAll()).recurrenceRules.find((r) => r.id === rule.id)!;
    expect(after.finished).toBe(true);
    expect(after.createdCount).toBe(2);
    expect(await runRecurrences('2031-01-01')).toBe(0);
  });

  it('stops at the end date, inclusive', async () => {
    const { drawer, date, input } = await setup();
    await addRecurrenceRule(drawer.id, input({ end: { kind: 'date', endDate: '2027-01-15' } }), '2026-10-20');
    expect(await runRecurrences('2030-01-01')).toBe(3); // Nov 15, Dec 15, Jan 15
    const dates = (await records(drawer.id)).map((r) => r.values[date.id]).sort();
    expect(dates.at(-1)).toBe('2027-01-15');
    expect((await loadAll()).recurrenceRules[0].finished).toBe(true);
  });

  it('keeps going from its saved copy if the original is deleted, and survives a later required field', async () => {
    const { drawer, name, date, original, input } = await setup();
    await addRecurrenceRule(drawer.id, input(), '2026-10-20');
    const { deleteRecord } = await import('./repository');
    await deleteRecord(original.id);
    const memo = await addField(drawer.id, { name: '메모', kind: 'text', required: true });
    expect(await runRecurrences('2026-11-15')).toBe(1);
    const made = (await records(drawer.id))[0];
    expect(made.values[name.id]).toBe('선크림');
    expect(made.values[date.id]).toBe('2026-11-15');
    expect(made.values[memo.id]).toBeUndefined(); // generated records are not blocked by a required field added later
  });

  it('refuses a target without a date, other drawers, bad intervals and bad end conditions, and duplicates', async () => {
    const { drawer, name, date, input } = await setup();
    const undated = await createRecord(drawer.id, { [name.id]: '날짜 없음' });
    await expect(addRecurrenceRule(drawer.id, input({ targetRecordId: undated.id }), '2026-10-20')).rejects.toThrow('날짜가 없어요');
    await expect(addRecurrenceRule(drawer.id, input({ fieldId: name.id }), '2026-10-20')).rejects.toBeInstanceOf(ValidationError);
    await expect(addRecurrenceRule(drawer.id, input({ interval: 0 }), '2026-10-20')).rejects.toBeInstanceOf(ValidationError);
    await expect(addRecurrenceRule(drawer.id, input({ end: { kind: 'count', count: 0 } }), '2026-10-20')).rejects.toBeInstanceOf(ValidationError);
    await expect(addRecurrenceRule(drawer.id, input({ end: { kind: 'date', endDate: '2026-10-01' } }), '2026-10-20')).rejects.toThrow('오늘 이후');
    const other = await makeDrawer('다른'); 
    await expect(addRecurrenceRule(other.id, input(), '2026-10-20')).rejects.toBeInstanceOf(ValidationError);
    await addRecurrenceRule(drawer.id, input(), '2026-10-20');
    await expect(addRecurrenceRule(drawer.id, input(), '2026-10-20')).rejects.toThrow('이미');
    expect(date.kind).toBe('date');
  });

  it('is removed with its date field or drawer; deleting just the rule keeps the records it made', async () => {
    const { drawer, date, input } = await setup();
    const rule = await addRecurrenceRule(drawer.id, input(), '2026-10-20');
    await runRecurrences('2026-11-15');
    await deleteRecurrenceRule(rule.id);
    expect(await records(drawer.id)).toHaveLength(2);
    await addRecurrenceRule(drawer.id, input({ interval: 2 }), '2026-10-20');
    await deleteField(date.id);
    expect((await loadAll()).recurrenceRules).toEqual([]);
  });
});
