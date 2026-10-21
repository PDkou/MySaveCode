import { STORES, req, withTx } from './db';
import type {
  Drawer, DrawerInput, Field, FieldInput, FieldValue, NotificationRule, RecordItem, RecurrenceCycle, RecurrenceEnd, RecurrenceRule,
} from './types';
import { MAX_NOTIFY_DAYS_BEFORE, MAX_RECORD_PHOTOS } from './types';
import { firstIndexAfter, isFinishedAfter, dueOccurrences } from '../flow/recurrence';
import { ValidationError, assertUniqueFieldName, cleanDrawerName, cleanFieldName, validateRecordValues } from './validation';
import { t } from '../i18n';

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
  notificationRules: NotificationRule[];
  recurrenceRules: RecurrenceRule[];
  settings: Record<string, unknown>;
}

export async function loadAll(): Promise<Snapshot> {
  return withTx([STORES.drawers, STORES.fields, STORES.records, STORES.notifications, STORES.recurrences, STORES.settings], 'readonly', async (s) => {
    const [drawers, fields, records, notificationRules, recurrenceRules, settingRows] = await Promise.all([
      req(s.drawers.getAll() as IDBRequest<Drawer[]>),
      req(s.fields.getAll() as IDBRequest<Field[]>),
      req(s.records.getAll() as IDBRequest<RecordItem[]>),
      req(s.notifications.getAll() as IDBRequest<NotificationRule[]>),
      req(s.recurrences.getAll() as IDBRequest<RecurrenceRule[]>),
      req(s.settings.getAll() as IDBRequest<{ key: string; value: unknown }[]>),
    ]);
    return {
      drawers: drawers.sort(byOrder),
      fields: fields.sort(byOrder),
      records: records.sort((a, b) => b.createdAt - a.createdAt),
      notificationRules: notificationRules.sort((a, b) => a.createdAt - b.createdAt),
      recurrenceRules: recurrenceRules.sort((a, b) => a.createdAt - b.createdAt),
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
  if (fieldInputs.length === 0) throw new ValidationError(t('서랍 칸을 하나 이상 만들어 주세요.'));
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
    if (!current) throw new ValidationError(t('서랍을 찾을 수 없어요.'));
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
      throw new ValidationError(t('서랍 순서를 바꾸지 못했어요.'));
    }
    const byId = new Map(all.map((d) => [d.id, d]));
    for (let i = 0; i < idsInOrder.length; i++) {
      await req(s.drawers.put({ ...byId.get(idsInOrder[i])!, order: i }));
    }
  });
}

/** Deletes a drawer together with all of its fields, records and photos. */
export async function deleteDrawer(id: string): Promise<void> {
  await withTx([STORES.drawers, STORES.fields, STORES.records, STORES.photos, STORES.settings, STORES.notifications, STORES.recurrences], 'readwrite', async (s) => {
    await req(s.settings.delete(`tableview.${id}`));
    for (const key of await req(s.notifications.index('drawerId').getAllKeys(id))) await req(s.notifications.delete(key));
    for (const key of await req(s.recurrences.index('drawerId').getAllKeys(id))) await req(s.recurrences.delete(key));
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
  if (input.kind === 'select' && options.length < 2) throw new ValidationError(t('선택 항목은 2개 이상 필요해요.'));
  if (input.kind === 'select' && new Set(options).size !== options.length) throw new ValidationError(t('같은 선택 항목이 여러 개 있어요.'));
  return { name, kind: input.kind, required: input.required ?? false, options: input.kind === 'select' ? options : [] };
}

export async function addField(drawerId: string, input: FieldInput): Promise<Field> {
  const norm = normalizeField(input);
  return withTx([STORES.drawers, STORES.fields], 'readwrite', async (s) => {
    if (!(await req(s.drawers.get(drawerId)))) throw new ValidationError(t('서랍을 찾을 수 없어요.'));
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
    if (!current) throw new ValidationError(t('서랍 칸을 찾을 수 없어요.'));
    const options = patch.options ? patch.options.map((o) => o.trim()).filter(Boolean) : current.options;
    if (current.kind === 'select' && options.length < 2) throw new ValidationError(t('선택 항목은 2개 이상 필요해요.'));
    if (current.kind === 'select' && new Set(options).size !== options.length) throw new ValidationError(t('같은 선택 항목이 여러 개 있어요.'));
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
      throw new ValidationError(t('서랍 칸 순서를 바꾸지 못했어요.'));
    }
    const byId = new Map(all.map((f) => [f.id, f]));
    for (let i = 0; i < idsInOrder.length; i++) {
      await req(s.fields.put({ ...byId.get(idsInOrder[i])!, order: i }));
    }
  });
}

/** Deleting a field also removes its value from every record in that drawer. */
export async function deleteField(id: string): Promise<void> {
  await withTx([STORES.fields, STORES.records, STORES.notifications, STORES.recurrences], 'readwrite', async (s) => {
    const field = (await req(s.fields.get(id))) as Field | undefined;
    if (!field) return;
    // Rules that counted on this date field go with it.
    const notifs = await req(s.notifications.index('drawerId').getAll(field.drawerId) as IDBRequest<NotificationRule[]>);
    for (const n of notifs) if (n.fieldId === id) await req(s.notifications.delete(n.id));
    const recs = await req(s.recurrences.index('drawerId').getAll(field.drawerId) as IDBRequest<RecurrenceRule[]>);
    for (const r of recs) if (r.fieldId === id) await req(s.recurrences.delete(r.id));
    const siblings = await req(s.fields.index('drawerId').getAll(field.drawerId) as IDBRequest<Field[]>);
    if (siblings.length <= 1) throw new ValidationError(t('서랍 칸은 최소 1개 있어야 해요.'));
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
  if (photos.length > MAX_RECORD_PHOTOS) throw new ValidationError(t('사진은 최대 {MAX_RECORD_PHOTOS}장까지 등록할 수 있어요.', { MAX_RECORD_PHOTOS }));
  if (photos.some((p) => !p.type.startsWith('image/'))) throw new ValidationError(t('이미지 파일만 등록할 수 있어요.'));
}

/** Adds a record, and its photos in the same transaction (none are written when there are none). */
export async function createRecord(drawerId: string, values: Record<string, FieldValue>, photos: readonly Blob[] = []): Promise<RecordItem> {
  assertPhotos(photos);
  return withTx([STORES.drawers, STORES.fields, STORES.records, STORES.photos], 'readwrite', async (s) => {
    if (!(await req(s.drawers.get(drawerId)))) throw new ValidationError(t('서랍을 찾을 수 없어요.'));
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
    if (!current) throw new ValidationError(t('보관품을 찾을 수 없어요.'));
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
    if (!(await req(s.records.get(recordId)))) throw new ValidationError(t('보관품을 찾을 수 없어요.'));
    await req(s.photos.put({ recordId, photos: [...photos] }));
  });
}

// ------------------------------------------------------------ notifications

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Adds "N days before the date in this field, at this time". The same rule cannot be added twice. */
export async function addNotificationRule(
  drawerId: string,
  input: { fieldId: string; daysBefore: number; time: string },
): Promise<NotificationRule> {
  if (!Number.isInteger(input.daysBefore) || input.daysBefore < 0 || input.daysBefore > MAX_NOTIFY_DAYS_BEFORE) {
    throw new ValidationError(t('알림 시점은 당일부터 {MAX_NOTIFY_DAYS_BEFORE}일 전까지 정할 수 있어요.', { MAX_NOTIFY_DAYS_BEFORE }));
  }
  if (!TIME_RE.test(input.time)) throw new ValidationError(t('알림 시간을 확인해 주세요.'));
  return withTx([STORES.drawers, STORES.fields, STORES.notifications], 'readwrite', async (s) => {
    if (!(await req(s.drawers.get(drawerId)))) throw new ValidationError(t('서랍을 찾을 수 없어요.'));
    const field = (await req(s.fields.get(input.fieldId))) as Field | undefined;
    if (!field || field.drawerId !== drawerId || field.kind !== 'date') throw new ValidationError(t('날짜 서랍 칸을 골라 주세요.'));
    const existing = await req(s.notifications.index('drawerId').getAll(drawerId) as IDBRequest<NotificationRule[]>);
    if (existing.some((n) => n.fieldId === input.fieldId && n.daysBefore === input.daysBefore && n.time === input.time)) {
      throw new ValidationError(t('같은 알림이 이미 있어요.'));
    }
    const rule: NotificationRule = { id: newId(), drawerId, fieldId: input.fieldId, daysBefore: input.daysBefore, time: input.time, createdAt: Date.now() };
    await req(s.notifications.add(rule));
    return rule;
  });
}

export async function deleteNotificationRule(id: string): Promise<void> {
  await withTx([STORES.notifications], 'readwrite', async (s) => { await req(s.notifications.delete(id)); });
}

// --------------------------------------------------------------- recurrence

const isISODate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export interface RecurrenceInput {
  targetRecordId: string;
  fieldId: string;
  cycle: RecurrenceCycle;
  interval: number;
  end: RecurrenceEnd;
  /** Shown in the rule list (the target's title at the time). */
  targetLabel: string;
}

/**
 * Adds "make a new record every N weeks/months/years". Periods are counted
 * from the target's date in `fieldId`; only periods after `todayISO` are
 * ever made (earlier ones are history). Nothing is created here, and the
 * target is never changed.
 */
export async function addRecurrenceRule(drawerId: string, input: RecurrenceInput, todayISO: string): Promise<RecurrenceRule> {
  if (!['weekly', 'monthly', 'yearly'].includes(input.cycle)) throw new ValidationError(t('반복 주기를 골라 주세요.'));
  if (!Number.isInteger(input.interval) || input.interval < 1 || input.interval > 99) throw new ValidationError(t('반복 간격은 1 이상으로 정해 주세요.'));
  if (input.end.kind === 'count' && (!Number.isInteger(input.end.count) || input.end.count < 1 || input.end.count > 999)) {
    throw new ValidationError(t('만들 횟수는 1 이상으로 정해 주세요.'));
  }
  if (input.end.kind === 'date' && (!isISODate(input.end.endDate) || input.end.endDate <= todayISO)) {
    throw new ValidationError(t('종료 날짜는 오늘 이후로 정해 주세요.'));
  }
  return withTx([STORES.drawers, STORES.fields, STORES.records, STORES.recurrences], 'readwrite', async (s) => {
    if (!(await req(s.drawers.get(drawerId)))) throw new ValidationError(t('서랍을 찾을 수 없어요.'));
    const field = (await req(s.fields.get(input.fieldId))) as Field | undefined;
    if (!field || field.drawerId !== drawerId || field.kind !== 'date') throw new ValidationError(t('기준이 될 날짜 서랍 칸을 골라 주세요.'));
    const target = (await req(s.records.get(input.targetRecordId))) as RecordItem | undefined;
    if (!target || target.drawerId !== drawerId) throw new ValidationError(t('반복할 보관품을 찾을 수 없어요.'));
    const baseDate = target.values[input.fieldId];
    if (!isISODate(baseDate)) throw new ValidationError(t('이 보관품에는 \'{name}\' 날짜가 없어요. 날짜를 먼저 채워 주세요.', { name: field.name }));
    const existing = await req(s.recurrences.index('drawerId').getAll(drawerId) as IDBRequest<RecurrenceRule[]>);
    if (existing.some((r) => !r.finished && r.targetRecordId === input.targetRecordId && r.fieldId === input.fieldId && r.cycle === input.cycle && r.interval === input.interval)) {
      throw new ValidationError(t('같은 반복 설정이 이미 있어요.'));
    }
    const startIndex = firstIndexAfter(baseDate, input.cycle, input.interval, todayISO);
    const rule: RecurrenceRule = {
      id: newId(), drawerId, fieldId: input.fieldId, targetRecordId: target.id, targetLabel: input.targetLabel,
      template: { ...target.values }, baseDate, cycle: input.cycle, interval: input.interval, end: input.end,
      startIndex, nextIndex: startIndex, createdCount: 0,
      finished: isFinishedAfter({ baseDate, cycle: input.cycle, interval: input.interval, end: input.end }, startIndex, 0),
      createdAt: Date.now(),
    };
    await req(s.recurrences.add(rule));
    return rule;
  });
}

/** Removes the rule only: records it already made stay. */
export async function deleteRecurrenceRule(id: string): Promise<void> {
  await withTx([STORES.recurrences], 'readwrite', async (s) => { await req(s.recurrences.delete(id)); });
}

/**
 * Makes every record that is due by `todayISO` (at most `cap` per rule per
 * call). Each record and the rule's progress are written in one transaction,
 * so running this twice, or from two tabs, never makes the same period twice.
 * The copy is made from the target as it is now (or from the saved copy if the
 * target was deleted); only the rule's date field changes, and photos are not
 * copied. Returns how many records were made.
 */
export async function runRecurrences(todayISO: string, cap = 60): Promise<number> {
  const rules = await withTx([STORES.recurrences], 'readonly', async (s) => req(s.recurrences.getAll() as IDBRequest<RecurrenceRule[]>));
  let made = 0;
  for (const listed of rules) {
    if (listed.finished) continue;
    for (let n = 0; n < cap; n++) {
      const created = await withTx([STORES.drawers, STORES.fields, STORES.records, STORES.recurrences], 'readwrite', async (s) => {
        const rule = (await req(s.recurrences.get(listed.id))) as RecurrenceRule | undefined;
        if (!rule || rule.finished) return false;
        const [due] = dueOccurrences(rule, todayISO, 1);
        if (!due) {
          // Nothing due now; remember if the end condition has been reached.
          if (isFinishedAfter(rule, rule.nextIndex, rule.createdCount)) await req(s.recurrences.put({ ...rule, finished: true }));
          return false;
        }
        const fields = await fieldsOf(s, rule.drawerId);
        const field = fields.find((f) => f.id === rule.fieldId);
        if (!(await req(s.drawers.get(rule.drawerId))) || !field || field.kind !== 'date') {
          await req(s.recurrences.put({ ...rule, finished: true }));
          return false;
        }
        const target = (await req(s.records.get(rule.targetRecordId))) as RecordItem | undefined;
        const base = target ? target.values : rule.template;
        const values: Record<string, FieldValue> = {};
        for (const f of fields) if (f.id in base && base[f.id] !== undefined) values[f.id] = base[f.id];
        values[rule.fieldId] = due.date;
        validateRecordValues(fields, values, true);
        const now = Date.now();
        await req(s.records.add({ id: newId(), drawerId: rule.drawerId, values, createdAt: now, updatedAt: now } satisfies RecordItem));
        const createdCount = rule.createdCount + 1;
        const nextIndex = due.index + 1;
        await req(s.recurrences.put({
          ...rule, template: { ...base }, nextIndex, createdCount,
          finished: isFinishedAfter(rule, nextIndex, createdCount),
        }));
        return true;
      });
      if (!created) break;
      made++;
    }
  }
  return made;
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

/** Saves several settings in one transaction: all of them or none. */
export async function setSettings(entries: Record<string, unknown>): Promise<void> {
  await withTx([STORES.settings], 'readwrite', async (s) => {
    for (const [key, value] of Object.entries(entries)) await req(s.settings.put({ key, value }));
  });
}

// ------------------------------------------------------- backup / restore

/** Every saved photo set (recordId -> photos), for a backup. */
export async function loadAllPhotos(): Promise<Map<string, Blob[]>> {
  return withTx([STORES.photos], 'readonly', async (s) => {
    const rows = (await req(s.photos.getAll() as IDBRequest<{ recordId: string; photos: Blob[] }[]>));
    return new Map(rows.map((r) => [r.recordId, r.photos]));
  });
}

/**
 * Replaces everything on the device with a restored backup, in ONE transaction: if anything fails, nothing
 * changes. The PIN and lock settings (`security.*`) are not part of a backup and are kept as they are.
 */
export async function replaceAllData(snapshot: {
  drawers: Drawer[]; fields: Field[]; records: RecordItem[]; notificationRules: NotificationRule[]; recurrenceRules: RecurrenceRule[];
  settings: Record<string, unknown>; photos: Map<string, Blob[]>;
}): Promise<void> {
  await withTx(Object.values(STORES), 'readwrite', async (s) => {
    for (const name of [STORES.drawers, STORES.fields, STORES.records, STORES.photos, STORES.notifications, STORES.recurrences] as const) await req(s[name].clear());
    const old = (await req(s.settings.getAllKeys())) as string[];
    for (const key of old) if (!key.startsWith('security.')) await req(s.settings.delete(key));
    for (const d of snapshot.drawers) await req(s.drawers.put(d));
    for (const f of snapshot.fields) await req(s.fields.put(f));
    for (const r of snapshot.records) await req(s.records.put(r));
    for (const [recordId, photos] of snapshot.photos) await req(s.photos.put({ recordId, photos }));
    for (const n of snapshot.notificationRules) await req(s.notifications.put(n));
    for (const r of snapshot.recurrenceRules) await req(s.recurrences.put(r));
    for (const [key, value] of Object.entries(snapshot.settings)) if (!key.startsWith('security.')) await req(s.settings.put({ key, value }));
  });
}

// ------------------------------------------------------------------ reset

/** "데이터 초기화": removes every drawer, field, record, photo and setting. */
export async function resetAllData(): Promise<void> {
  await withTx(Object.values(STORES), 'readwrite', async (s) => {
    for (const store of Object.values(s)) await req(store.clear());
  });
}
