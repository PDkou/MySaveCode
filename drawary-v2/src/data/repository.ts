import { STORES, req, withTx } from './db';
import type { Drawer, DrawerInput, Field, FieldInput, FieldValue, RecordItem } from './types';
import { MAX_RECORD_PHOTOS } from './types';
import { ValidationError, assertUniqueFieldName, cleanDrawerName, cleanFieldName, validateRecordValues } from './validation';

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;
const nextOrder = (items: readonly { order: number }[]) => items.reduce((max, x) => Math.max(max, x.order), -1) + 1;

export interface Snapshot {
  drawers: Drawer[];
  fields: Field[];
  records: RecordItem[];
  settings: Record<string, unknown>;
}

export async function loadAll(): Promise<Snapshot> {
  return withTx([STORES.drawers, STORES.fields, STORES.records, STORES.settings], 'readonly', async (s) => {
    const [drawers, fields, records, settingRows] = await Promise.all([
      req(s.drawers.getAll() as IDBRequest<Drawer[]>),
      req(s.fields.getAll() as IDBRequest<Field[]>),
      req(s.records.getAll() as IDBRequest<RecordItem[]>),
      req(s.settings.getAll() as IDBRequest<{ key: string; value: unknown }[]>),
    ]);
    return {
      drawers: drawers.sort(byOrder),
      fields: fields.sort(byOrder),
      records: records.sort((a, b) => b.createdAt - a.createdAt),
      settings: Object.fromEntries(settingRows.map((row) => [row.key, row.value])),
    };
  });
}

// ---------------------------------------------------------------- drawers

export async function createDrawer(input: DrawerInput): Promise<Drawer> {
  const name = cleanDrawerName(input.name);
  return withTx([STORES.drawers], 'readwrite', async (s) => {
    const existing = await req(s.drawers.getAll() as IDBRequest<Drawer[]>);
    const now = Date.now();
    const drawer: Drawer = {
      id: newId(), name, iconKey: input.iconKey, colorKey: input.colorKey,
      order: nextOrder(existing), createdAt: now, updatedAt: now,
    };
    await req(s.drawers.add(drawer));
    return drawer;
  });
}

/**
 * The create-drawer flow's final step: the drawer and all of its fields are
 * written in one transaction, so a bad field leaves nothing behind and a
 * double tap can never produce half a drawer.
 */
export async function createDrawerWithFields(input: DrawerInput, fieldInputs: readonly FieldInput[]): Promise<{ drawer: Drawer; fields: Field[] }> {
  const name = cleanDrawerName(input.name);
  if (fieldInputs.length === 0) throw new ValidationError('서랍 칸을 하나 이상 만들어 주세요.');
  const norms = fieldInputs.map(normalizeField);
  norms.forEach((n, i) => assertUniqueFieldName(norms.slice(0, i).map((m, j) => ({ id: String(j), name: m.name })), n.name));
  return withTx([STORES.drawers, STORES.fields], 'readwrite', async (s) => {
    const existing = await req(s.drawers.getAll() as IDBRequest<Drawer[]>);
    const now = Date.now();
    const drawer: Drawer = {
      id: newId(), name, iconKey: input.iconKey, colorKey: input.colorKey,
      order: nextOrder(existing), createdAt: now, updatedAt: now,
    };
    await req(s.drawers.add(drawer));
    const fields: Field[] = [];
    for (let i = 0; i < norms.length; i++) {
      const field: Field = { id: newId(), drawerId: drawer.id, ...norms[i], order: i };
      await req(s.fields.add(field));
      fields.push(field);
    }
    return { drawer, fields };
  });
}

export async function updateDrawer(id: string, patch: Partial<DrawerInput>): Promise<Drawer> {
  return withTx([STORES.drawers], 'readwrite', async (s) => {
    const current = (await req(s.drawers.get(id))) as Drawer | undefined;
    if (!current) throw new ValidationError('서랍을 찾을 수 없어요.');
    const next: Drawer = {
      ...current,
      ...(patch.name !== undefined ? { name: cleanDrawerName(patch.name) } : null),
      ...(patch.iconKey !== undefined ? { iconKey: patch.iconKey } : null),
      ...(patch.colorKey !== undefined ? { colorKey: patch.colorKey } : null),
      updatedAt: Date.now(),
    };
    await req(s.drawers.put(next));
    return next;
  });
}

export async function reorderDrawers(idsInOrder: readonly string[]): Promise<void> {
  await withTx([STORES.drawers], 'readwrite', async (s) => {
    const all = (await req(s.drawers.getAll() as IDBRequest<Drawer[]>));
    const known = new Set(all.map((d) => d.id));
    if (idsInOrder.length !== all.length || idsInOrder.some((id) => !known.has(id)) || new Set(idsInOrder).size !== all.length) {
      throw new ValidationError('서랍 순서를 바꾸지 못했어요.');
    }
    const byId = new Map(all.map((d) => [d.id, d]));
    for (let i = 0; i < idsInOrder.length; i++) {
      await req(s.drawers.put({ ...byId.get(idsInOrder[i])!, order: i }));
    }
  });
}

/** Deletes a drawer together with all of its fields, records and photos. */
export async function deleteDrawer(id: string): Promise<void> {
  await withTx([STORES.drawers, STORES.fields, STORES.records, STORES.photos], 'readwrite', async (s) => {
    const fieldKeys = await req(s.fields.index('drawerId').getAllKeys(id));
    const recordKeys = await req(s.records.index('drawerId').getAllKeys(id));
    for (const key of fieldKeys) await req(s.fields.delete(key));
    for (const key of recordKeys) {
      await req(s.records.delete(key));
      await req(s.photos.delete(key));
    }
    await req(s.drawers.delete(id));
  });
}

// ----------------------------------------------------------------- fields

/** Validates one field definition and returns its stored shape (without id/order). */
function normalizeField(input: FieldInput): Pick<Field, 'name' | 'kind' | 'required' | 'options'> {
  const name = cleanFieldName(input.name);
  const options = (input.options ?? []).map((o) => o.trim()).filter(Boolean);
  if (input.kind === 'select' && options.length < 2) throw new ValidationError('선택 항목은 2개 이상 필요해요.');
  if (input.kind === 'select' && new Set(options).size !== options.length) throw new ValidationError('같은 선택 항목이 여러 개 있어요.');
  return { name, kind: input.kind, required: input.required ?? false, options: input.kind === 'select' ? options : [] };
}

export async function addField(drawerId: string, input: FieldInput): Promise<Field> {
  const norm = normalizeField(input);
  return withTx([STORES.drawers, STORES.fields], 'readwrite', async (s) => {
    if (!(await req(s.drawers.get(drawerId)))) throw new ValidationError('서랍을 찾을 수 없어요.');
    const siblings = await req(s.fields.index('drawerId').getAll(drawerId) as IDBRequest<Field[]>);
    assertUniqueFieldName(siblings, norm.name);
    const field: Field = { id: newId(), drawerId, ...norm, order: nextOrder(siblings) };
    await req(s.fields.add(field));
    return field;
  });
}

/** Kind cannot change after creation: existing record values would no longer match it. */
export async function updateField(id: string, patch: Partial<Pick<Field, 'name' | 'required' | 'options'>>): Promise<Field> {
  return withTx([STORES.fields, STORES.records], 'readwrite', async (s) => {
    const current = (await req(s.fields.get(id))) as Field | undefined;
    if (!current) throw new ValidationError('서랍 칸을 찾을 수 없어요.');
    const options = patch.options ? patch.options.map((o) => o.trim()).filter(Boolean) : current.options;
    if (current.kind === 'select' && options.length < 2) throw new ValidationError('선택 항목은 2개 이상 필요해요.');
    if (current.kind === 'select' && new Set(options).size !== options.length) throw new ValidationError('같은 선택 항목이 여러 개 있어요.');
    const name = patch.name !== undefined ? cleanFieldName(patch.name) : current.name;
    assertUniqueFieldName(await req(s.fields.index('drawerId').getAll(current.drawerId) as IDBRequest<Field[]>), name, id);
    const next: Field = {
      ...current,
      name,
      required: patch.required ?? current.required,
      options: current.kind === 'select' ? options : [],
    };
    await req(s.fields.put(next));
    // A choice that is no longer offered cannot stay as a record's value: clear it, in this same transaction.
    if (current.kind === 'select') {
      const kept = new Set(options);
      const records = await req(s.records.index('drawerId').getAll(current.drawerId) as IDBRequest<RecordItem[]>);
      for (const record of records) {
        const v = record.values[id];
        if (typeof v === 'string' && !kept.has(v)) {
          const { [id]: _removed, ...rest } = record.values;
          await req(s.records.put({ ...record, values: rest, updatedAt: Date.now() }));
        }
      }
    }
    return next;
  });
}

export async function reorderFields(drawerId: string, idsInOrder: readonly string[]): Promise<void> {
  await withTx([STORES.fields], 'readwrite', async (s) => {
    const all = await req(s.fields.index('drawerId').getAll(drawerId) as IDBRequest<Field[]>);
    const known = new Set(all.map((f) => f.id));
    if (idsInOrder.length !== all.length || idsInOrder.some((id) => !known.has(id)) || new Set(idsInOrder).size !== all.length) {
      throw new ValidationError('서랍 칸 순서를 바꾸지 못했어요.');
    }
    const byId = new Map(all.map((f) => [f.id, f]));
    for (let i = 0; i < idsInOrder.length; i++) {
      await req(s.fields.put({ ...byId.get(idsInOrder[i])!, order: i }));
    }
  });
}

/** Deleting a field also removes its value from every record in that drawer. */
export async function deleteField(id: string): Promise<void> {
  await withTx([STORES.fields, STORES.records], 'readwrite', async (s) => {
    const field = (await req(s.fields.get(id))) as Field | undefined;
    if (!field) return;
    const siblings = await req(s.fields.index('drawerId').getAll(field.drawerId) as IDBRequest<Field[]>);
    if (siblings.length <= 1) throw new ValidationError('서랍 칸은 최소 1개 있어야 해요.');
    const records = await req(s.records.index('drawerId').getAll(field.drawerId) as IDBRequest<RecordItem[]>);
    for (const record of records) {
      if (id in record.values) {
        const { [id]: _removed, ...rest } = record.values;
        await req(s.records.put({ ...record, values: rest, updatedAt: Date.now() }));
      }
    }
    await req(s.fields.delete(id));
  });
}

// ---------------------------------------------------------------- records

async function fieldsOf(s: { fields: IDBObjectStore }, drawerId: string): Promise<Field[]> {
  return req(s.fields.index('drawerId').getAll(drawerId) as IDBRequest<Field[]>);
}

function assertPhotos(photos: readonly Blob[]): void {
  if (photos.length > MAX_RECORD_PHOTOS) throw new ValidationError(`사진은 최대 ${MAX_RECORD_PHOTOS}장까지 등록할 수 있어요.`);
  if (photos.some((p) => !p.type.startsWith('image/'))) throw new ValidationError('이미지 파일만 등록할 수 있어요.');
}

/** Adds a record, and its photos in the same transaction (none are written when there are none). */
export async function createRecord(drawerId: string, values: Record<string, FieldValue>, photos: readonly Blob[] = []): Promise<RecordItem> {
  assertPhotos(photos);
  return withTx([STORES.drawers, STORES.fields, STORES.records, STORES.photos], 'readwrite', async (s) => {
    if (!(await req(s.drawers.get(drawerId)))) throw new ValidationError('서랍을 찾을 수 없어요.');
    validateRecordValues(await fieldsOf(s, drawerId), values);
    const now = Date.now();
    const record: RecordItem = { id: newId(), drawerId, values: { ...values }, createdAt: now, updatedAt: now };
    await req(s.records.add(record));
    if (photos.length > 0) await req(s.photos.put({ recordId: record.id, photos: [...photos] }));
    return record;
  });
}

/**
 * Replaces all values of a record (the edit screen always submits the full
 * set). `photos` undefined leaves the saved photos alone; an array (even an
 * empty one) replaces them, in the same transaction as the values.
 */
export async function updateRecord(id: string, values: Record<string, FieldValue>, photos?: readonly Blob[]): Promise<RecordItem> {
  if (photos) assertPhotos(photos);
  return withTx([STORES.fields, STORES.records, STORES.photos], 'readwrite', async (s) => {
    const current = (await req(s.records.get(id))) as RecordItem | undefined;
    if (!current) throw new ValidationError('보관품을 찾을 수 없어요.');
    validateRecordValues(await fieldsOf(s, current.drawerId), values);
    const next: RecordItem = { ...current, values: { ...values }, updatedAt: Date.now() };
    await req(s.records.put(next));
    if (photos) await req(s.photos.put({ recordId: id, photos: [...photos] }));
    return next;
  });
}

export async function deleteRecord(id: string): Promise<void> {
  await withTx([STORES.records, STORES.photos], 'readwrite', async (s) => {
    await req(s.records.delete(id));
    await req(s.photos.delete(id));
  });
}

// ----------------------------------------------------------------- photos

/** null = never set, [] = explicitly cleared. */
export async function getPhotos(recordId: string): Promise<Blob[] | null> {
  return withTx([STORES.photos], 'readonly', async (s) => {
    const row = (await req(s.photos.get(recordId))) as { photos: Blob[] } | undefined;
    return row ? row.photos : null;
  });
}

export async function setPhotos(recordId: string, photos: readonly Blob[]): Promise<void> {
  assertPhotos(photos);
  await withTx([STORES.records, STORES.photos], 'readwrite', async (s) => {
    if (!(await req(s.records.get(recordId)))) throw new ValidationError('보관품을 찾을 수 없어요.');
    await req(s.photos.put({ recordId, photos: [...photos] }));
  });
}

// --------------------------------------------------------------- settings

export async function getSetting<T>(key: string): Promise<T | undefined> {
  return withTx([STORES.settings], 'readonly', async (s) => {
    const row = (await req(s.settings.get(key))) as { value: T } | undefined;
    return row?.value;
  });
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await withTx([STORES.settings], 'readwrite', async (s) => {
    await req(s.settings.put({ key, value }));
  });
}

// ------------------------------------------------------------------ reset

/** "데이터 초기화": removes every drawer, field, record, photo and setting. */
export async function resetAllData(): Promise<void> {
  await withTx([STORES.drawers, STORES.fields, STORES.records, STORES.photos, STORES.settings], 'readwrite', async (s) => {
    for (const store of Object.values(s)) await req(store.clear());
  });
}
