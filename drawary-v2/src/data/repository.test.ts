import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { DB_NAME, DB_VERSION, STORES, closeDB, openDB } from './db';
import {
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

    await resetAllData();

    expect(await loadAll()).toEqual({ drawers: [], fields: [], records: [], settings: {} });
    expect(await getPhotos(r.id)).toBeNull();
  });
});
