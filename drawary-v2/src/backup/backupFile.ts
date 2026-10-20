import type { Drawer, Field, FieldKind, FieldValue, NotificationRule, RecordItem, RecurrenceRule } from '../data/types';
import { MAX_NOTIFY_DAYS_BEFORE, MAX_RECORD_PHOTOS } from '../data/types';
import { buildZip, readZip, ZipError, ZIP_LIMITS, type ZipEntry } from './zip';
import { isLang } from '../i18n';
import { isThemeId } from '../flow/theme';
import { NOTIFY_COMMON_KEY } from '../flow/notifySettings';
import { t } from '../i18n';

/**
 * The backup file (#45-#53). A zip (with photos) or a plain .json (without):
 *   backup.json            { app, format, createdAt, includesPhotos, drawers, fields, records, notificationRules,
 *                            recurrenceRules, settings, photos: { recordId: [{ file, type }] } }
 *   photos/<recordId>/<n>.<ext>
 * Not in the file, on purpose: the PIN, the lock settings and the wrong-try count (`security.*`). A backup that
 * could be copied around must not carry the key to the app, and a restore must not unlock or lock the device.
 */
export const BACKUP_APP = 'drawary';
export const BACKUP_FORMAT = 1;

export interface Snapshot {
  drawers: Drawer[];
  fields: Field[];
  records: RecordItem[];
  notificationRules: NotificationRule[];
  recurrenceRules: RecurrenceRule[];
  settings: Record<string, unknown>;
  /** recordId -> photos */
  photos: Map<string, Blob[]>;
}

export interface BackupSummary {
  createdAt: number;
  includesPhotos: boolean;
  drawers: number;
  fields: number;
  records: number;
  photos: number;
  kind: 'zip' | 'json';
}

export class BackupError extends Error {}

const FIELD_KINDS: readonly FieldKind[] = ['text', 'long_text', 'number', 'currency', 'date', 'photo', 'select', 'check', 'rating', 'link'];
const CYCLES = ['weekly', 'monthly', 'yearly'] as const;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// ----------------------------------------------------------------- settings

/** The settings that travel in a backup. Everything else, above all `security.*`, stays on the device. */
export function backupSettings(settings: Record<string, unknown>, drawerIds: ReadonlySet<string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settings)) {
    if (key === 'theme' && isThemeId(value)) out[key] = value;
    else if (key === 'language' && isLang(value)) out[key] = value;
    else if (key === NOTIFY_COMMON_KEY && value && typeof value === 'object') out[key] = JSON.parse(JSON.stringify(value));
    else if (key.startsWith('tableview.') && drawerIds.has(key.slice('tableview.'.length)) && value && typeof value === 'object') out[key] = JSON.parse(JSON.stringify(value));
  }
  return out;
}

// ------------------------------------------------------------------ writing

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic', 'image/avif': 'avif' };
const MIME_BY_EXT = Object.fromEntries(Object.entries(EXT).map(([m, e]) => [e, m]));

const two = (n: number) => String(n).padStart(2, '0');
export const backupFileName = (now: Date, includePhotos: boolean) =>
  `Drawary_Backup_${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}.${includePhotos ? 'zip' : 'json'}`;

export interface CreatedBackup { fileName: string; blob: Blob; summary: BackupSummary }

export async function createBackup(snapshot: Snapshot, includePhotos: boolean, now: Date = new Date()): Promise<CreatedBackup> {
  const drawerIds = new Set(snapshot.drawers.map((d) => d.id));
  const recordIds = new Set(snapshot.records.map((r) => r.id));
  const photoMap: Record<string, { file: string; type: string }[]> = {};
  const photoEntries: ZipEntry[] = [];
  let photoCount = 0;
  if (includePhotos) {
    for (const [recordId, blobs] of snapshot.photos) {
      if (!recordIds.has(recordId)) continue;
      const list: { file: string; type: string }[] = [];
      for (let i = 0; i < blobs.length && i < MAX_RECORD_PHOTOS; i++) {
        const type = blobs[i].type || 'application/octet-stream';
        const file = `photos/${recordId}/${i + 1}.${EXT[type] ?? 'bin'}`;
        photoEntries.push({ name: file, data: new Uint8Array(await blobs[i].arrayBuffer()) });
        list.push({ file, type });
        photoCount++;
      }
      if (list.length) photoMap[recordId] = list;
    }
  }
  const doc = {
    app: BACKUP_APP, format: BACKUP_FORMAT, createdAt: now.toISOString(), includesPhotos: includePhotos,
    drawers: snapshot.drawers, fields: snapshot.fields, records: snapshot.records,
    notificationRules: snapshot.notificationRules, recurrenceRules: snapshot.recurrenceRules,
    settings: backupSettings(snapshot.settings, drawerIds),
    ...(includePhotos ? { photos: photoMap } : {}),
  };
  const json = new TextEncoder().encode(JSON.stringify(doc));
  const summary: BackupSummary = {
    createdAt: now.getTime(), includesPhotos: includePhotos, drawers: snapshot.drawers.length, fields: snapshot.fields.length,
    records: snapshot.records.length, photos: photoCount, kind: includePhotos ? 'zip' : 'json',
  };
  const fileName = backupFileName(now, includePhotos);
  if (!includePhotos) return { fileName, blob: new Blob([json as BlobPart], { type: 'application/json' }), summary };
  const zip = buildZip([{ name: 'backup.json', data: json }, ...photoEntries]);
  return { fileName, blob: new Blob([zip as BlobPart], { type: 'application/zip' }), summary };
}

// ------------------------------------------------------------------ reading

const bad = () => new BackupError(t('백업 파일이 손상되어 읽을 수 없어요.'));
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): string => { if (typeof v !== 'string') throw bad(); return v; };
const num = (v: unknown): number => { if (typeof v !== 'number' || !Number.isFinite(v)) throw bad(); return v; };
const arr = (v: unknown): unknown[] => { if (!Array.isArray(v)) throw bad(); return v; };
const bool = (v: unknown): boolean => { if (typeof v !== 'boolean') throw bad(); return v; };
const isValue = (v: unknown): v is FieldValue => v === null || ['string', 'number', 'boolean'].includes(typeof v);

function uniqueIds<T extends { id: string }>(items: T[]): T[] {
  if (new Set(items.map((i) => i.id)).size !== items.length) throw bad();
  return items;
}

function cleanValues(raw: unknown, fieldIds: ReadonlySet<string>): Record<string, FieldValue> {
  if (!isObj(raw)) throw bad();
  const out: Record<string, FieldValue> = {};
  for (const [k, v] of Object.entries(raw)) if (fieldIds.has(k) && isValue(v)) out[k] = v;
  return out;
}

function parseDoc(doc: unknown): Omit<Snapshot, 'photos'> & { photoRefs: Record<string, { file: string; type: string }[]>; includesPhotos: boolean; createdAt: number } {
  if (!isObj(doc) || doc.app !== BACKUP_APP) throw new BackupError(t('Drawary 백업 파일이 아니에요. .zip 또는 .json 백업 파일을 선택해 주세요.'));
  if (typeof doc.format !== 'number') throw bad();
  if (doc.format > BACKUP_FORMAT) throw new BackupError(t('더 새로운 버전의 Drawary에서 만든 백업이에요. 앱을 업데이트한 뒤 다시 시도해 주세요.'));
  const created = typeof doc.createdAt === 'string' ? Date.parse(doc.createdAt) : NaN;

  const drawers = uniqueIds(arr(doc.drawers).map((raw): Drawer => {
    if (!isObj(raw)) throw bad();
    return { id: str(raw.id), name: str(raw.name), iconKey: str(raw.iconKey), colorKey: str(raw.colorKey), order: num(raw.order), createdAt: num(raw.createdAt), updatedAt: num(raw.updatedAt) };
  }));
  const drawerIds = new Set(drawers.map((d) => d.id));

  const fields = uniqueIds(arr(doc.fields).map((raw): Field => {
    if (!isObj(raw)) throw bad();
    const kind = str(raw.kind) as FieldKind;
    const drawerId = str(raw.drawerId);
    if (!FIELD_KINDS.includes(kind) || !drawerIds.has(drawerId)) throw bad();
    return { id: str(raw.id), drawerId, name: str(raw.name), kind, required: bool(raw.required), options: arr(raw.options).map(str), order: num(raw.order) };
  }));
  const fieldsByDrawer = new Map<string, Set<string>>();
  for (const f of fields) { if (!fieldsByDrawer.has(f.drawerId)) fieldsByDrawer.set(f.drawerId, new Set()); fieldsByDrawer.get(f.drawerId)!.add(f.id); }
  const dateFields = new Set(fields.filter((f) => f.kind === 'date').map((f) => `${f.drawerId}:${f.id}`));

  const records = uniqueIds(arr(doc.records).map((raw): RecordItem => {
    if (!isObj(raw)) throw bad();
    const drawerId = str(raw.drawerId);
    if (!drawerIds.has(drawerId)) throw bad();
    return { id: str(raw.id), drawerId, values: cleanValues(raw.values, fieldsByDrawer.get(drawerId) ?? new Set()), createdAt: num(raw.createdAt), updatedAt: num(raw.updatedAt) };
  }));
  const recordIds = new Set(records.map((r) => r.id));

  // Rules that point at something that is not in the file are left out rather than failing the whole restore.
  const notificationRules: NotificationRule[] = [];
  for (const raw of arr(doc.notificationRules ?? [])) {
    if (!isObj(raw)) throw bad();
    const rule = { id: str(raw.id), drawerId: str(raw.drawerId), fieldId: str(raw.fieldId), daysBefore: num(raw.daysBefore), time: str(raw.time), createdAt: num(raw.createdAt) };
    if (dateFields.has(`${rule.drawerId}:${rule.fieldId}`) && Number.isInteger(rule.daysBefore) && rule.daysBefore >= 0 && rule.daysBefore <= MAX_NOTIFY_DAYS_BEFORE && HHMM.test(rule.time)) notificationRules.push(rule);
  }
  uniqueIds(notificationRules);

  const recurrenceRules: RecurrenceRule[] = [];
  for (const raw of arr(doc.recurrenceRules ?? [])) {
    if (!isObj(raw)) throw bad();
    const end = raw.end;
    const endOk = isObj(end) && (end.kind === 'never' || (end.kind === 'count' && Number.isInteger(end.count) && (end.count as number) >= 1) || (end.kind === 'date' && typeof end.endDate === 'string' && ISO_DAY.test(end.endDate)));
    const rule = {
      id: str(raw.id), drawerId: str(raw.drawerId), fieldId: str(raw.fieldId), targetRecordId: str(raw.targetRecordId), targetLabel: str(raw.targetLabel),
      template: cleanValues(raw.template, fieldsByDrawer.get(str(raw.drawerId)) ?? new Set()), baseDate: str(raw.baseDate), cycle: raw.cycle as RecurrenceRule['cycle'],
      interval: num(raw.interval), end: end as RecurrenceRule['end'], startIndex: num(raw.startIndex), nextIndex: num(raw.nextIndex), createdCount: num(raw.createdCount),
      finished: bool(raw.finished), createdAt: num(raw.createdAt),
    };
    // targetRecordId may point at a record that was deleted (the rule keeps its own copy); the date field must exist.
    void recordIds;
    if (endOk && dateFields.has(`${rule.drawerId}:${rule.fieldId}`) && CYCLES.includes(rule.cycle) && Number.isInteger(rule.interval) && rule.interval >= 1 && ISO_DAY.test(rule.baseDate)) recurrenceRules.push(rule);
  }
  uniqueIds(recurrenceRules);

  const settings = isObj(doc.settings) ? backupSettings(doc.settings, drawerIds) : {};

  const photoRefs: Record<string, { file: string; type: string }[]> = {};
  if (doc.photos !== undefined) {
    if (!isObj(doc.photos)) throw bad();
    for (const [recordId, list] of Object.entries(doc.photos)) {
      if (!recordIds.has(recordId)) continue;
      photoRefs[recordId] = arr(list).slice(0, MAX_RECORD_PHOTOS).map((p) => {
        if (!isObj(p)) throw bad();
        const type = str(p.type);
        if (!type.startsWith('image/')) throw bad();
        return { file: str(p.file), type };
      });
    }
  }
  return { drawers, fields, records, notificationRules, recurrenceRules, settings, photoRefs, includesPhotos: doc.includesPhotos === true, createdAt: Number.isFinite(created) ? created : 0 };
}

export interface ParsedBackup { summary: BackupSummary; snapshot: Snapshot }

/** Reads and checks a backup file completely, before anything on the device is touched. */
export async function readBackup(file: Blob): Promise<ParsedBackup> {
  if (file.size > ZIP_LIMITS.totalBytes) throw new BackupError(t('파일이 너무 커서 복원할 수 없어요.'));
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isZip = bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
  let jsonBytes: Uint8Array;
  let entries = new Map<string, Uint8Array>();
  if (isZip) {
    let list: ZipEntry[];
    try { list = await readZip(bytes); } catch (e) { if (e instanceof ZipError) throw bad(); throw e; }
    entries = new Map(list.map((e) => [e.name, e.data]));
    const main = entries.get('backup.json');
    if (!main) throw new BackupError(t('Drawary 백업 파일이 아니에요. .zip 또는 .json 백업 파일을 선택해 주세요.'));
    jsonBytes = main;
  } else jsonBytes = bytes;
  let doc: unknown;
  try { doc = JSON.parse(new TextDecoder('utf-8').decode(jsonBytes)); } catch { throw new BackupError(t('Drawary 백업 파일이 아니에요. .zip 또는 .json 백업 파일을 선택해 주세요.')); }
  const parsed = parseDoc(doc);

  const photos = new Map<string, Blob[]>();
  let photoCount = 0;
  for (const [recordId, refs] of Object.entries(parsed.photoRefs)) {
    const blobs: Blob[] = [];
    for (const ref of refs) {
      const data = entries.get(ref.file);
      if (!data) throw bad();
      const ext = ref.file.split('.').pop() ?? '';
      blobs.push(new Blob([data as BlobPart], { type: ref.type || MIME_BY_EXT[ext] || 'application/octet-stream' }));
      photoCount++;
    }
    if (blobs.length) photos.set(recordId, blobs);
  }
  const { photoRefs: _p, includesPhotos, createdAt, ...rest } = parsed;
  void _p;
  const snapshot: Snapshot = { ...rest, photos };
  return {
    snapshot,
    summary: { createdAt, includesPhotos, drawers: snapshot.drawers.length, fields: snapshot.fields.length, records: snapshot.records.length, photos: photoCount, kind: isZip ? 'zip' : 'json' },
  };
}
