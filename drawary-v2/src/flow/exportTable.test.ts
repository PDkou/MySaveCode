import { describe, expect, it } from 'vitest';
import type { Field } from '../data/types';
import { buildCsv, csvEscape, exportFileName } from './exportTable';
import { columnsOf, type TableRowData } from './tableQuery';

const f = (id: string, name: string, kind: Field['kind']): Field => ({ id, drawerId: 'd', name, kind, required: false, options: [], order: 0 });
const cols = columnsOf([f('n', '제품명', 'text'), f('d', '구매일', 'date'), f('p', '가격', 'currency'), f('c', '완료', 'check'), f('s', '별점', 'rating'), f('ph', '사진', 'photo')]);
const rows: TableRowData[] = [
  { id: '1', values: { n: '립 "틴트", 코랄', d: '2024-03-12', p: 13000, c: true, s: 4 }, photoCount: 2 },
  { id: '2', values: { n: '=SUM(A1)', p: 0 }, photoCount: 0 },
  { id: '3', values: { n: '줄\n바꿈' }, photoCount: 0 },
];

describe('CSV export', () => {
  it('writes a BOM, CRLF lines, a header row and machine-friendly values', () => {
    const csv = buildCsv(cols, rows);
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe('제품명,구매일,가격,완료,별점,사진');
    expect(lines[1]).toBe('"립 ""틴트"", 코랄",2024-03-12,13000,체크함,4,2');
    expect(lines[2]).toBe("'=SUM(A1),,0,,,0");
    expect(lines[3]).toBe('"줄\n바꿈",,,,,0');
    expect(csv.endsWith('\r\n')).toBe(true);
  });
  it('still writes the header when there are no rows', () => {
    expect(buildCsv(cols, [])).toBe('﻿제품명,구매일,가격,완료,별점,사진\r\n');
  });
  it('keeps plain negative numbers but neutralizes text that starts like a formula', () => {
    expect(csvEscape('-5')).toBe('-5');
    expect(csvEscape('-5+A1')).toBe("'-5+A1");
    expect(csvEscape('@x')).toBe("'@x");
    expect(csvEscape('a,b')).toBe('"a,b"');
  });
});

describe('export file names', () => {
  it('builds a safe file name with the date', () => {
    expect(exportFileName('화장품 / 뷰티', 'csv', new Date(2026, 9, 20))).toBe('화장품_뷰티_20261020.csv');
    expect(exportFileName('///', 'pdf', new Date(2026, 0, 5))).toBe('서랍_20260105.pdf');
  });
});
