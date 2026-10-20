import type { Field, FieldKind, FieldValue, RecordItem } from '../data/types';
import { ValidationError, isEmptyValue } from '../data/validation';
import { getLocale, t, K } from '../i18n';

/**
 * What a form control holds while the user is typing. Text-like kinds keep
 * the raw string (numbers and money are parsed only on save, so "13,000" is
 * fine to type), check keeps a boolean, rating keeps 0-5 (0 = not rated).
 */
export type FieldDraft = string | boolean | number;
export type RecordDraft = Record<string, FieldDraft>;

/** Photos live at the top of every form (#13/#17), not as a separate row, so a `photo` field has no control. */
export const hasControl = (kind: FieldKind): boolean => kind !== 'photo';

export function emptyDraft(fields: readonly Field[]): RecordDraft {
  const draft: RecordDraft = {};
  for (const f of fields) {
    if (!hasControl(f.kind)) continue;
    draft[f.id] = f.kind === 'check' ? false : f.kind === 'rating' ? 0 : '';
  }
  return draft;
}

export function draftFromRecord(fields: readonly Field[], record: Pick<RecordItem, 'values'>): RecordDraft {
  const draft = emptyDraft(fields);
  for (const f of fields) {
    if (!hasControl(f.kind)) continue;
    const v = record.values[f.id];
    if (v === undefined || v === null) continue;
    if (f.kind === 'check') draft[f.id] = v === true;
    else if (f.kind === 'rating') draft[f.id] = typeof v === 'number' ? v : 0;
    else draft[f.id] = String(v);
  }
  return draft;
}

function parseNumber(raw: string, field: Field): number {
  const cleaned = raw.replace(/[,\s]/g, '').replace(/원$/, '');
  const n = Number(cleaned);
  if (cleaned === '' || !Number.isFinite(n)) throw new ValidationError(t('\'{name}\'에는 숫자를 입력해 주세요.', { name: field.name }));
  if (field.kind === 'currency' && !Number.isInteger(n)) throw new ValidationError(t('\'{name}\'은(는) 원 단위 정수로 입력해 주세요.', { name: field.name }));
  return n;
}

/**
 * Turns what was typed into stored values. Empty answers are left out (the
 * data model reads a missing key as "never filled in"); unparsable numbers
 * throw a ValidationError the screen can show. Required/shape checks happen
 * again in the repository.
 */
export function draftToValues(fields: readonly Field[], draft: RecordDraft): Record<string, FieldValue> {
  const values: Record<string, FieldValue> = {};
  for (const f of fields) {
    if (!hasControl(f.kind)) continue;
    const d = draft[f.id];
    switch (f.kind) {
      case 'check':
        values[f.id] = d === true;
        break;
      case 'rating':
        if (typeof d === 'number' && d > 0) values[f.id] = d;
        break;
      case 'number':
      case 'currency': {
        const s = typeof d === 'string' ? d.trim() : '';
        if (s) values[f.id] = parseNumber(s, f);
        break;
      }
      default: {
        const s = typeof d === 'string' ? d.trim() : '';
        if (s) values[f.id] = s;
      }
    }
  }
  return values;
}

const WEEKDAYS = [K('일'), K('월'), K('화'), K('수'), K('목'), K('금'), K('토')];

/** 2024-03-12 -> "2024. 03. 12. (화)", the way #16 shows dates. Returns the input unchanged if it is not an ISO date. */
export function formatDate(iso: string, withWeekday = true): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  if (!withWeekday) return `${y}. ${mo}. ${d}.`;
  const wd = t(WEEKDAYS[new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d))).getUTCDay()]);
  return `${y}. ${mo}. ${d}. (${wd})`;
}

/** The text #16 shows for a stored value. Money is shown as stored with thousands separators and no symbol (#16 CONFIRMED.md). */
export function formatValue(field: Pick<Field, 'kind'>, value: FieldValue | undefined): string {
  if (value === undefined || value === null) return '';
  switch (field.kind) {
    case 'date': return typeof value === 'string' ? formatDate(value) : '';
    case 'currency':
    case 'number': return typeof value === 'number' ? value.toLocaleString(getLocale()) : String(value);
    case 'rating': return typeof value === 'number' ? '★'.repeat(value) + '☆'.repeat(5 - value) : '';
    case 'check': return value === true ? t('체크함') : t('체크 안 함');
    default: return String(value);
  }
}

export interface RecordSummary {
  title: string;
  subtitle?: string;
  dateLabel?: string;
  /** The field whose value became the title; #16 leaves it out of its field list. */
  titleFieldId?: string;
}

const TEXT_KINDS: readonly FieldKind[] = ['text', 'long_text', 'select', 'link'];

/**
 * How a record is named in lists: the first filled text-like field is the
 * title, the second is the subtitle (long notes only when nothing shorter exists), the first date is the date line (falling
 * back to when it was added).
 */
export function summarizeRecord(fields: readonly Field[], record: Pick<RecordItem, 'values' | 'createdAt'>): RecordSummary {
  const filled = (f: Field) => !isEmptyValue(record.values[f.id]);
  // Short text first (in field order); a long note only if nothing shorter can be the title/subtitle.
  const textFields = [
    ...fields.filter((f) => TEXT_KINDS.includes(f.kind) && f.kind !== 'long_text' && filled(f)),
    ...fields.filter((f) => f.kind === 'long_text' && filled(f)),
  ];
  const titleField = textFields[0] ?? fields.find((f) => hasControl(f.kind) && f.kind !== 'check' && filled(f));
  const subtitleField = textFields.find((f) => f !== titleField);
  const dateField = fields.find((f) => f.kind === 'date' && filled(f));
  const created = new Date(record.createdAt);
  const createdIso = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`;
  return {
    title: titleField ? formatValue(titleField, record.values[titleField.id]) : t('이름 없는 보관품'),
    subtitle: subtitleField ? formatValue(subtitleField, record.values[subtitleField.id]) : undefined,
    dateLabel: dateField ? formatDate(String(record.values[dateField.id]), false) : formatDate(createdIso, false),
    titleFieldId: titleField?.id,
  };
}

/**
 * Everything searchable in a record, as one lowercase string: each value as shown
 * and, for text/dates, as stored (so "2024-03" and "2024. 03" both find a date).
 */
export function recordSearchText(fields: readonly Field[], record: Pick<RecordItem, 'values'>): string {
  const parts: string[] = [];
  for (const f of fields) {
    const v = record.values[f.id];
    if (v === undefined || v === null || !hasControl(f.kind)) continue;
    parts.push(formatValue(f, v));
    if (typeof v === 'string') parts.push(v);
  }
  return parts.join(' ').toLowerCase();
}

/** Case-insensitive match against every filled value of a record (the #15 search box). */
export function recordMatches(fields: readonly Field[], record: Pick<RecordItem, 'values'>, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return recordSearchText(fields, record).includes(q);
}
