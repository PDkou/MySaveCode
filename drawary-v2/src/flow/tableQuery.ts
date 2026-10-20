import type { Field, FieldKind, FieldValue, RecordItem } from '../data/types';
import { formatDate, formatValue } from './recordForm';

/**
 * Table view (#20-#23, #27): columns are a drawer's 서랍 칸, rows are its
 * 보관품. Search, sort and filter all work on these typed rows (not on the
 * display strings), so numbers sort as numbers and dates as dates.
 */
export type ColumnType = 'text' | 'note' | 'number' | 'currency' | 'date' | 'select' | 'rating' | 'link' | 'checkbox' | 'photo';

export interface TableColumn {
  id: string;
  label: string;
  type: ColumnType;
  width: number;
}

export interface TableRowData {
  id: string;
  values: Record<string, FieldValue>;
  photoCount: number;
}

export interface SortChoice { columnId: string; direction: 0 | 1 }

export type Operator =
  | 'contains' | 'equals' | 'empty' | 'notEmpty'
  | 'gte' | 'lte' | 'between' | 'before' | 'after'
  | 'checked' | 'unchecked' | 'hasPhoto' | 'noPhoto';

export interface FilterRule {
  id: string;
  columnId: string;
  operator: Operator;
  value?: string;
  value2?: string;
}

export type MatchMode = 'all' | 'any';

/** The persisted view of one drawer's table (what sort/filter it opens with). */
export interface TableViewState {
  sort: SortChoice | null;
  rules: FilterRule[];
  matchMode: MatchMode;
}
export const EMPTY_VIEW: TableViewState = { sort: null, rules: [], matchMode: 'all' };

const TYPE_BY_KIND: Record<FieldKind, ColumnType> = {
  text: 'text', long_text: 'note', number: 'number', currency: 'currency', date: 'date',
  photo: 'photo', select: 'select', check: 'checkbox', rating: 'rating', link: 'link',
};
const WIDTH_BY_TYPE: Record<ColumnType, number> = {
  text: 160, note: 220, number: 110, currency: 110, date: 150, select: 130, rating: 120, link: 200, checkbox: 100, photo: 100,
};

/** Columns in the drawer's field order. A `photo` field becomes a 사진 column showing how many photos each record has. */
export function columnsOf(fields: readonly Field[]): TableColumn[] {
  return fields.map((f) => {
    const type = TYPE_BY_KIND[f.kind];
    return { id: f.id, label: f.name, type, width: WIDTH_BY_TYPE[type] };
  });
}

/** What a cell shows (and what table search matches). */
export function cellText(col: TableColumn, row: TableRowData): string {
  if (col.type === 'photo') return row.photoCount > 0 ? `${row.photoCount}장` : '';
  const v = row.values[col.id];
  if (v === undefined || v === null) return '';
  // Dates in the table drop the weekday, like #15's date line; money has no symbol (#20 CONFIRMED.md).
  if (col.type === 'date') return typeof v === 'string' ? formatDate(v, false) : '';
  return formatValue({ kind: col.type === 'checkbox' ? 'check' : col.type === 'note' ? 'long_text' : (col.type as FieldKind) }, v);
}

export const toRows = (records: readonly RecordItem[], photoCounts: Record<string, number>): TableRowData[] =>
  records.map((r) => ({ id: r.id, values: r.values, photoCount: photoCounts[r.id] ?? 0 }));

// ----------------------------------------------------------------- search

const norm = (s: string) => s.toLocaleLowerCase('ko-KR');

/** #21: substring match against every shown cell, as typed in. */
export function searchRows(rows: readonly TableRowData[], cols: readonly TableColumn[], query: string): TableRowData[] {
  const q = norm(query.trim());
  if (!q) return [...rows];
  return rows.filter((row) => cols.some((c) => norm(cellText(c, row)).includes(q)));
}

// ------------------------------------------------------------------- sort

export const isSortable = (col: Pick<TableColumn, 'type'>) => col.type !== 'photo';

function sortKey(col: TableColumn, row: TableRowData): number | string | null {
  const v = row.values[col.id];
  if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) return null;
  switch (col.type) {
    case 'number': case 'currency': case 'rating': return typeof v === 'number' ? v : Number(v);
    case 'checkbox': return v === true ? 1 : 0;
    case 'date': return String(v); // ISO dates sort as text
    default: return norm(String(v));
  }
}

/**
 * #22: one sort at a time. direction 0 = the first label (오래된순 / 낮은순 /
 * 가나다순), 1 = the second. Empty cells always go last. Stable, so equal
 * rows keep their order. Photo columns cannot be sorted.
 */
export function sortRows(rows: readonly TableRowData[], cols: readonly TableColumn[], choice: SortChoice | null): TableRowData[] {
  const col = choice ? cols.find((c) => c.id === choice.columnId) : undefined;
  if (!choice || !col || !isSortable(col)) return [...rows];
  const indexed = rows.map((row, i) => ({ row, i, key: sortKey(col, row) }));
  indexed.sort((a, b) => {
    if (a.key === null && b.key === null) return a.i - b.i;
    if (a.key === null) return 1;
    if (b.key === null) return -1;
    const cmp = typeof a.key === 'number' && typeof b.key === 'number'
      ? a.key - b.key
      : String(a.key).localeCompare(String(b.key), 'ko-KR');
    return cmp === 0 ? a.i - b.i : choice.direction === 0 ? cmp : -cmp;
  });
  return indexed.map((x) => x.row);
}

// ----------------------------------------------------------------- filter

/** The operators each column type offers, in the order #23 shows them. */
export function operatorsFor(type: ColumnType): Operator[] {
  switch (type) {
    case 'number': case 'currency': case 'rating': return ['gte', 'lte', 'between'];
    case 'date': return ['before', 'after', 'between'];
    case 'checkbox': return ['checked', 'unchecked'];
    case 'photo': return ['hasPhoto', 'noPhoto'];
    default: return ['contains', 'equals', 'empty'];
  }
}

export const operatorNeedsValue = (op: Operator): boolean =>
  ['contains', 'equals', 'gte', 'lte', 'between', 'before', 'after'].includes(op);

export function parseNumberInput(raw: string): number | null {
  const cleaned = raw.replace(/[,\s원]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** "2024-03-12", "2024. 03. 12." or "20240312" -> "2024-03-12"; null if it is not a real date. */
export function parseDateInput(raw: string): string | null {
  const m = /^(\d{4})\D*(\d{1,2})\D*(\d{1,2})\D*$/.exec(raw.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${m[1]}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** A message when the rule cannot be used yet (missing or unreadable value), else null. */
export function ruleProblem(rule: Pick<FilterRule, 'operator' | 'value' | 'value2'>, type: ColumnType): string | null {
  if (!operatorNeedsValue(rule.operator)) return null;
  const v = (rule.value ?? '').trim();
  const v2 = (rule.value2 ?? '').trim();
  if (rule.operator === 'contains' || rule.operator === 'equals') return v ? null : '내용을 입력해 주세요.';
  const needsSecond = rule.operator === 'between';
  if (type === 'date') {
    const a = parseDateInput(v); const b = parseDateInput(v2);
    if (!a || (needsSecond && !b)) return '날짜를 확인해 주세요.';
    if (needsSecond && a > b!) return '시작 날짜가 끝 날짜보다 늦어요.';
    return null;
  }
  const a = parseNumberInput(v); const b = parseNumberInput(v2);
  if (a === null || (needsSecond && b === null)) return '숫자를 입력해 주세요.';
  if (needsSecond && a > b!) return '작은 값을 앞에 입력해 주세요.';
  return null;
}

export function matchesRule(row: TableRowData, rule: FilterRule, col: TableColumn): boolean {
  if (col.type === 'photo') return rule.operator === 'hasPhoto' ? row.photoCount > 0 : rule.operator === 'noPhoto' ? row.photoCount === 0 : true;
  const v = row.values[col.id];
  const empty = v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
  const text = norm(cellText(col, row));
  const raw = norm(typeof v === 'string' ? v : '');
  switch (rule.operator) {
    case 'empty': return empty;
    case 'notEmpty': return !empty;
    // Text match works on what is shown and on the stored text (so "2024-03" and "2024. 03" both find a date).
    case 'contains': return text.includes(norm(rule.value ?? '')) || raw.includes(norm(rule.value ?? ''));
    case 'equals': return text === norm((rule.value ?? '').trim()) || raw === norm((rule.value ?? '').trim());
    case 'checked': return v === true;
    case 'unchecked': return v !== true;
    case 'gte': case 'lte': {
      if (typeof v !== 'number') return false;
      const a = parseNumberInput(rule.value ?? '');
      return a !== null && (rule.operator === 'gte' ? v >= a : v <= a);
    }
    case 'before': case 'after': {
      if (typeof v !== 'string') return false;
      const a = parseDateInput(rule.value ?? '');
      return a !== null && (rule.operator === 'before' ? v < a : v > a);
    }
    case 'between': {
      if (col.type === 'date') {
        if (typeof v !== 'string') return false;
        const a = parseDateInput(rule.value ?? ''); const b = parseDateInput(rule.value2 ?? '');
        return a !== null && b !== null && v >= a && v <= b;
      }
      if (typeof v !== 'number') return false;
      const a = parseNumberInput(rule.value ?? ''); const b = parseNumberInput(rule.value2 ?? '');
      return a !== null && b !== null && v >= a && v <= b;
    }
    default: return true;
  }
}

/** #23: rules whose column no longer exists are ignored. */
export function filterRows(rows: readonly TableRowData[], cols: readonly TableColumn[], rules: readonly FilterRule[], mode: MatchMode): TableRowData[] {
  const live = rules.filter((r) => cols.some((c) => c.id === r.columnId));
  if (live.length === 0) return [...rows];
  return rows.filter((row) => {
    const results = live.map((rule) => matchesRule(row, rule, cols.find((c) => c.id === rule.columnId)!));
    return mode === 'all' ? results.every(Boolean) : results.some(Boolean);
  });
}

/** Filter, then sort: what the table shows (search is applied on top by the screen). */
export function applyView(rows: readonly TableRowData[], cols: readonly TableColumn[], view: TableViewState): TableRowData[] {
  return sortRows(filterRows(rows, cols, view.rules, view.matchMode), cols, view.sort);
}

