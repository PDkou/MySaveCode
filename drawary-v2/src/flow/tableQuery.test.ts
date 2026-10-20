import { describe, expect, it } from 'vitest';
import type { Field } from '../data/types';
import {
  applyView, cellText, columnsOf, filterRows, isSortable, matchesRule, operatorsFor, parseDateInput, ruleProblem,
  searchRows, sortRows, type FilterRule, type TableRowData,
} from './tableQuery';

const f = (id: string, name: string, kind: Field['kind'], options: string[] = []): Field =>
  ({ id, drawerId: 'd', name, kind, required: false, options, order: 0 });
const fields = [f('n', '제품명', 'text'), f('d', '구매일', 'date'), f('p', '가격', 'currency'), f('c', '완료', 'check'), f('s', '별점', 'rating'), f('ph', '사진', 'photo'), f('cat', '분류', 'select', ['가', '나'])];
const cols = columnsOf(fields);
const row = (id: string, values: TableRowData['values'], photoCount = 0): TableRowData => ({ id, values, photoCount });
const rows: TableRowData[] = [
  row('a', { n: '립 틴트', d: '2024-03-12', p: 13000, c: true, s: 4, cat: '가' }, 2),
  row('b', { n: '쿠션', d: '2024-02-28', p: 32000, c: false, s: 5 }),
  row('c', { n: '팔레트', d: '2024-01-20', p: 28000, s: 3, cat: '나' }, 1),
  row('d', { n: '향수', p: 145000 }),
  row('e', { n: 'Apple', d: '2023-12-10', p: 9000 }),
];
const ids = (rs: TableRowData[]) => rs.map((r) => r.id);
const rule = (columnId: string, operator: FilterRule['operator'], value?: string, value2?: string): FilterRule => ({ id: columnId + operator, columnId, operator, value, value2 });

describe('table columns and cells', () => {
  it('maps fields to typed columns and shows cells like the rest of the app', () => {
    expect(cols.map((c) => c.type)).toEqual(['text', 'date', 'currency', 'checkbox', 'rating', 'photo', 'select']);
    const c = (id: string) => cols.find((x) => x.id === id)!;
    expect(cellText(c('d'), rows[0])).toBe('2024. 03. 12.');
    expect(cellText(c('p'), rows[0])).toBe('13,000');
    expect(cellText(c('ph'), rows[0])).toBe('2장');
    expect(cellText(c('ph'), rows[1])).toBe('');
    expect(cellText(c('s'), rows[0])).toBe('★★★★☆');
    expect(cellText(c('n'), rows[3])).toBe('향수');
    expect(cellText(c('d'), rows[3])).toBe('');
  });
});

describe('table search (#21)', () => {
  it('matches any shown cell, partially, ignoring case, and restores all rows when cleared', () => {
    expect(ids(searchRows(rows, cols, 'apple'))).toEqual(['e']);
    expect(ids(searchRows(rows, cols, '13,000'))).toEqual(['a']);
    expect(ids(searchRows(rows, cols, '2024. 0'))).toEqual(['a', 'b', 'c']);
    expect(ids(searchRows(rows, cols, '2장'))).toEqual(['a']);
    expect(ids(searchRows(rows, cols, '없는말'))).toEqual([]);
    expect(searchRows(rows, cols, '  ')).toHaveLength(5);
  });
});

describe('table sort (#22)', () => {
  it('sorts numbers as numbers and dates as dates, empty cells always last', () => {
    expect(ids(sortRows(rows, cols, { columnId: 'p', direction: 0 }))).toEqual(['e', 'a', 'c', 'b', 'd']);
    expect(ids(sortRows(rows, cols, { columnId: 'p', direction: 1 }))).toEqual(['d', 'b', 'c', 'a', 'e']);
    expect(ids(sortRows(rows, cols, { columnId: 'd', direction: 0 }))).toEqual(['e', 'c', 'b', 'a', 'd']);
    expect(ids(sortRows(rows, cols, { columnId: 'd', direction: 1 }))).toEqual(['a', 'b', 'c', 'e', 'd']);
  });
  it('sorts Korean text by 가나다 and keeps equal rows in their original order', () => {
    // Latin vs Hangul order depends on the engine's collation, so only the Korean rows are compared: ㄹ < ㅋ < ㅍ < ㅎ.
    expect(ids(sortRows(rows, cols, { columnId: 'n', direction: 0 })).filter((i) => i !== 'e')).toEqual(['a', 'b', 'c', 'd']);
    expect(ids(sortRows(rows, cols, { columnId: 'n', direction: 1 })).filter((i) => i !== 'e')).toEqual(['d', 'c', 'b', 'a']);
    expect(ids(sortRows(rows, cols, { columnId: 'cat', direction: 0 }))).toEqual(['a', 'c', 'b', 'd', 'e']);
  });
  it('never sorts by photos, and ignores a column that no longer exists', () => {
    expect(isSortable(cols.find((c) => c.id === 'ph')!)).toBe(false);
    expect(ids(sortRows(rows, cols, { columnId: 'ph', direction: 0 }))).toEqual(ids(rows));
    expect(ids(sortRows(rows, cols, { columnId: 'gone', direction: 0 }))).toEqual(ids(rows));
    expect(ids(sortRows(rows, cols, null))).toEqual(ids(rows));
  });
});

describe('table filter (#23)', () => {
  it('offers the operators the approved screen lists for each kind', () => {
    expect(operatorsFor('text')).toEqual(['contains', 'equals', 'empty']);
    expect(operatorsFor('currency')).toEqual(['gte', 'lte', 'between']);
    expect(operatorsFor('date')).toEqual(['before', 'after', 'between']);
    expect(operatorsFor('checkbox')).toEqual(['checked', 'unchecked']);
    expect(operatorsFor('photo')).toEqual(['hasPhoto', 'noPhoto']);
  });
  it('filters by text, number range, date range and checkbox; empty values never satisfy a range', () => {
    expect(ids(filterRows(rows, cols, [rule('n', 'contains', '틴')], 'all'))).toEqual(['a']);
    expect(ids(filterRows(rows, cols, [rule('n', 'equals', '쿠션')], 'all'))).toEqual(['b']);
    expect(ids(filterRows(rows, cols, [rule('cat', 'empty')], 'all'))).toEqual(['b', 'd', 'e']);
    expect(ids(filterRows(rows, cols, [rule('p', 'gte', '28,000')], 'all'))).toEqual(['b', 'c', 'd']);
    expect(ids(filterRows(rows, cols, [rule('p', 'between', '10000', '30000')], 'all'))).toEqual(['a', 'c']);
    expect(ids(filterRows(rows, cols, [rule('d', 'after', '2024. 01. 01.')], 'all'))).toEqual(['a', 'b', 'c']);
    expect(ids(filterRows(rows, cols, [rule('d', 'between', '2024-01-01', '2024-02-28')], 'all'))).toEqual(['b', 'c']);
    expect(ids(filterRows(rows, cols, [rule('c', 'checked')], 'all'))).toEqual(['a']);
    expect(ids(filterRows(rows, cols, [rule('c', 'unchecked')], 'all'))).toEqual(['b', 'c', 'd', 'e']);
    expect(ids(filterRows(rows, cols, [rule('ph', 'hasPhoto')], 'all'))).toEqual(['a', 'c']);
    expect(ids(filterRows(rows, cols, [rule('ph', 'noPhoto')], 'all'))).toEqual(['b', 'd', 'e']);
  });
  it('combines several rules as "모두 맞는" (all) or "하나라도 맞는" (any)', () => {
    const rs = [rule('p', 'gte', '30000'), rule('ph', 'hasPhoto')];
    expect(ids(filterRows(rows, cols, rs, 'all'))).toEqual([]);
    expect(ids(filterRows(rows, cols, rs, 'any'))).toEqual(['a', 'b', 'c', 'd']);
  });
  it('ignores rules whose column was deleted', () => {
    expect(ids(filterRows(rows, cols, [rule('gone', 'contains', 'x')], 'all'))).toEqual(ids(rows));
    expect(matchesRule(rows[0], rule('n', 'contains', '립'), cols[0])).toBe(true);
  });
  it('filters, then sorts, as one view', () => {
    expect(ids(applyView(rows, cols, { sort: { columnId: 'p', direction: 1 }, rules: [rule('p', 'gte', '20000')], matchMode: 'all' }))).toEqual(['d', 'b', 'c']);
  });
});

describe('filter input checks', () => {
  it('reads dates written several ways and rejects impossible ones', () => {
    expect(parseDateInput('2024. 3. 5.')).toBe('2024-03-05');
    expect(parseDateInput('20240305')).toBe('2024-03-05');
    expect(parseDateInput('2024-02-30')).toBeNull();
    expect(parseDateInput('내일')).toBeNull();
  });
  it('explains what is wrong with a rule before it can be added', () => {
    expect(ruleProblem({ operator: 'contains', value: ' ' }, 'text')).toMatch('내용');
    expect(ruleProblem({ operator: 'gte', value: 'abc' }, 'currency')).toMatch('숫자');
    expect(ruleProblem({ operator: 'between', value: '5', value2: '1' }, 'number')).toMatch('작은 값');
    expect(ruleProblem({ operator: 'after', value: '2024-13-01' }, 'date')).toMatch('날짜');
    expect(ruleProblem({ operator: 'between', value: '2024-05-01', value2: '2024-01-01' }, 'date')).toMatch('늦어요');
    expect(ruleProblem({ operator: 'checked' }, 'checkbox')).toBeNull();
    expect(ruleProblem({ operator: 'gte', value: '13,000' }, 'currency')).toBeNull();
  });
});
