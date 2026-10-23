import { describe, expect, it } from 'vitest';
import { PAGE_H, PAGE_W, assemblePdf, layoutTable, wrapText } from './tablePdf';

// 8 px per character, wide characters count the same: enough to exercise wrapping and paging deterministically.
const measure = (text: string) => Array.from(text).length * 8;

describe('table PDF layout', () => {
  it('wraps long text by character and keeps short text on one line', () => {
    expect(wrapText('짧은 글', 200, measure, false)).toEqual(['짧은 글']);
    const lines = wrapText('가'.repeat(40), 80, measure, false);
    expect(lines.length).toBe(4);
    expect(lines.every((l) => measure(l) <= 80)).toBe(true);
    expect(wrapText('abc def ghi', 50, measure, false)).toEqual(['abc', 'def', 'ghi']);
  });
  it('caps a very long cell so one row never outgrows a page', () => {
    expect(wrapText('가'.repeat(5000), 80, measure, false).length).toBeLessThanOrEqual(14);
  });
  it('fits the columns into the page width and starts a new page when the rows run out of room', () => {
    const labels = ['이름', '메모', '가격'];
    const rows = Array.from({ length: 120 }, (_, i) => [`제품 ${i}`, '메모 '.repeat(3), String(i * 1000)]);
    const layout = layoutTable(measure, labels, rows);
    const right = layout.colX[2] + layout.colW[2];
    expect(Math.round(right)).toBe(PAGE_W - 42);
    expect(layout.pages.length).toBeGreaterThan(1);
    expect(layout.pages.reduce((n, p) => n + p.rows.length, 0)).toBe(120);
    for (const page of layout.pages) for (const row of page.rows) expect(row.y + row.h).toBeLessThanOrEqual(PAGE_H);
  });
  it('lays out an empty table as a single page', () => {
    expect(layoutTable(measure, ['A'], [['none']]).pages.length).toBe(1);
  });
});

describe('PDF file writer', () => {
  it('writes a file whose cross-reference table points at its objects', () => {
    const pdf = assemblePdf([{ jpeg: new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]), w: 10, h: 6 }, { jpeg: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), w: 10, h: 6 }]);
    const text = new TextDecoder('latin1').decode(pdf);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(text).toContain('/Count 2');
    const start = Number(text.match(/startxref\n(\d+)/)![1]);
    expect(text.slice(start, start + 4)).toBe('xref');
    const entries = [...text.slice(start).matchAll(/(\d{10}) 00000 n /g)].map((m) => Number(m[1]));
    expect(entries.length).toBe(8);
    entries.forEach((offset, i) => expect(text.slice(offset, offset + 8)).toBe(`${i + 1} 0 obj\n`.slice(0, 8)));
  });
});
