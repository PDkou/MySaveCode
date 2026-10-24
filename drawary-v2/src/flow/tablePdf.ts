import { cellText, type TableColumn, type TableRowData } from './tableQuery';
import { dot, t } from '../i18n';

/**
 * "PDF로 내보내기": the table is drawn on A4 landscape pages (canvas, so every language's text comes out with the phone's own
 * fonts) and the pages are packed into a PDF file. Nothing goes through the phone's print service, which is what made the app
 * close on some phones. The page layout and the file writer are plain functions so they can be tested without a browser.
 */

/** A4 landscape in CSS pixels (96 dpi). */
export const PAGE_W = 1123;
export const PAGE_H = 794;
const MARGIN = 42;
const PAD_X = 8;
const PAD_Y = 6;
const LINE = 17;
const MIN_COL = 48;
const MAX_COL = 300;
const MAX_LINES = 14;
const FOOTER = 26;
const TITLE_BLOCK = 62;

export type Measure = (text: string, bold: boolean) => number;

export interface LaidOutRow { y: number; h: number; cells: string[][] }
export interface LaidOutPage { rows: LaidOutRow[] }
export interface TableLayout {
  colX: number[];
  colW: number[];
  header: { h: number; cells: string[][] };
  pages: LaidOutPage[];
  /** Where the table starts on the first page (below the title) and on the others. */
  firstTop: number;
  otherTop: number;
}

/** Greedy wrap by character (works for Korean/Japanese, which have no spaces), preferring to break at a space. */
export function wrapText(text: string, width: number, measure: Measure, bold: boolean): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = '';
    for (const ch of Array.from(paragraph)) {
      if (line && measure(line + ch, bold) > width) {
        const space = ch === ' ' ? -1 : line.lastIndexOf(' ');
        if (space > 0) { lines.push(line.slice(0, space)); line = line.slice(space + 1) + ch; }
        else { lines.push(line); line = ch === ' ' ? '' : ch; }
      } else line += ch;
    }
    lines.push(line);
  }
  if (lines.length > MAX_LINES) {
    const kept = lines.slice(0, MAX_LINES);
    kept[MAX_LINES - 1] = kept[MAX_LINES - 1].replace(/.?$/, '…');
    return kept;
  }
  return lines;
}

export function layoutTable(measure: Measure, labels: readonly string[], texts: readonly (readonly string[])[]): TableLayout {
  const avail = PAGE_W - 2 * MARGIN;
  // natural width: the widest line in the column, within limits
  const natural = labels.map((label, c) => {
    let w = measure(label, true);
    for (const row of texts) for (const line of (row[c] ?? '').split(/\r?\n/)) w = Math.max(w, measure(line, c === 0));
    return Math.min(MAX_COL, Math.max(MIN_COL, w + 2 * PAD_X + 2));
  });
  const total = natural.reduce((a, b) => a + b, 0) || 1;
  let colW = natural.map((w) => Math.max(MIN_COL, w * avail / total));
  const sum = colW.reduce((a, b) => a + b, 0) || 1;
  colW = colW.map((w) => w * avail / sum);
  const colX: number[] = [];
  let x = MARGIN;
  for (const w of colW) { colX.push(x); x += w; }
  if (labels.length === 0) { colW = [avail]; colX.length = 0; colX.push(MARGIN); }

  const wrapRow = (cells: readonly string[], boldFirst: boolean, allBold: boolean): { cells: string[][]; h: number } => {
    const wrapped = colW.map((w, c) => wrapText(cells[c] ?? '', w - 2 * PAD_X, measure, allBold || (boldFirst && c === 0)));
    const lines = Math.max(1, ...wrapped.map((l) => l.length));
    return { cells: wrapped, h: lines * LINE + 2 * PAD_Y };
  };
  const header = wrapRow(labels.length ? labels : [''], false, true);
  const firstTop = MARGIN + TITLE_BLOCK;
  const otherTop = MARGIN;
  const bottom = PAGE_H - MARGIN - FOOTER;

  const pages: LaidOutPage[] = [{ rows: [] }];
  let y = firstTop + header.h;
  for (const text of texts) {
    const row = wrapRow(text, true, false);
    if (y + row.h > bottom && pages[pages.length - 1].rows.length > 0) {
      pages.push({ rows: [] });
      y = otherTop + header.h;
    }
    pages[pages.length - 1].rows.push({ y, h: row.h, cells: row.cells });
    y += row.h;
  }
  return { colX, colW, header, pages, firstTop, otherTop };
}

/** A PDF made of one full-page JPEG per page. Sizes are in points (A4 landscape). */
export function assemblePdf(pages: readonly { jpeg: Uint8Array; w: number; h: number }[]): Uint8Array {
  const WPT = 841.89;
  const HPT = 595.28;
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (data: Uint8Array | string) => {
    const bytes = typeof data === 'string' ? enc.encode(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (num: number, body: () => void) => {
    offsets[num] = length;
    push(`${num} 0 obj\n`);
    body();
    push('\nendobj\n');
  };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  object(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  const kids = pages.map((_, i) => `${3 + 3 * i} 0 R`).join(' ');
  object(2, () => push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`));
  pages.forEach((page, i) => {
    const pageNum = 3 + 3 * i;
    object(pageNum, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${WPT} ${HPT}] /Resources << /XObject << /Im0 ${pageNum + 2} 0 R >> >> /Contents ${pageNum + 1} 0 R >>`));
    const content = `q ${WPT} 0 0 ${HPT} 0 0 cm /Im0 Do Q`;
    object(pageNum + 1, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
    object(pageNum + 2, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${page.w} /Height ${page.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`);
      push(page.jpeg);
      push('\nendstream');
    });
  });
  const count = 3 + 3 * pages.length;
  const xref = length;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let i = 1; i < count; i += 1) push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(length);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}

const FONT = "'Noto Sans CJK KR','Noto Sans KR','Noto Sans JP','Noto Sans CJK JP',sans-serif";
/** Canvas pixels per CSS pixel: sharp enough to read small text, small enough to keep the file light. */
const SCALE = 1.5;

/** The table as a PDF file (needs a browser/WebView canvas). */
export async function renderTablePdf(drawerName: string, columns: readonly TableColumn[], rows: readonly TableRowData[], printedOn: string): Promise<Blob> {
  try { await document.fonts?.ready; } catch { /* fonts API missing: draw with what there is */ }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(PAGE_W * SCALE);
  canvas.height = Math.round(PAGE_H * SCALE);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  const font = (bold: boolean, px: number) => `${bold ? '700' : '400'} ${px}px ${FONT}`;
  const measure: Measure = (text, bold) => { ctx.font = font(bold, 12.5); return ctx.measureText(text).width; };

  const labels = columns.map((c) => c.label);
  const texts = rows.map((r) => columns.map((c) => cellText(c, r)));
  const none = t('보관품이 없어요.');
  const layout = layoutTable(measure, labels, texts.length ? texts : [[none, ...columns.slice(1).map(() => '')]]);
  const meta = `${t('보관품 {n}개', { n: rows.length })}${dot()}${printedOn}`;

  const jpegs: { jpeg: Uint8Array; w: number; h: number }[] = [];
  for (let p = 0; p < layout.pages.length; p += 1) {
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    ctx.textBaseline = 'top';
    ctx.strokeStyle = '#bbbbbb';
    ctx.lineWidth = 1;
    let top = layout.otherTop;
    if (p === 0) {
      ctx.fillStyle = '#222222';
      ctx.font = font(true, 24);
      ctx.fillText(clip(ctx, drawerName, PAGE_W - 2 * MARGIN), MARGIN, MARGIN);
      ctx.fillStyle = '#666666';
      ctx.font = font(false, 12);
      ctx.fillText(meta, MARGIN, MARGIN + 34);
      top = layout.firstTop;
    }
    const drawRow = (y: number, h: number, cells: string[][], kind: 'head' | 'body') => {
      layout.colX.forEach((x, c) => {
        const w = layout.colW[c];
        if (kind === 'head') { ctx.fillStyle = '#efe9fb'; ctx.fillRect(x, y, w, h); }
        ctx.strokeRect(x + 0.5, y + 0.5, w, h);
        ctx.fillStyle = '#222222';
        ctx.font = font(kind === 'head' || c === 0, 12.5);
        (cells[c] ?? []).forEach((line, i) => ctx.fillText(line, x + PAD_X, y + PAD_Y + i * LINE));
      });
    };
    drawRow(top, layout.header.h, layout.header.cells, 'head');
    for (const row of layout.pages[p].rows) drawRow(row.y, row.h, row.cells, 'body');
    ctx.fillStyle = '#888888';
    ctx.font = font(false, 11);
    ctx.textAlign = 'right';
    ctx.fillText(`${p + 1} / ${layout.pages.length}`, PAGE_W - MARGIN, PAGE_H - MARGIN - 12);
    ctx.textAlign = 'left';
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    if (!blob) throw new Error('jpeg');
    jpegs.push({ jpeg: new Uint8Array(await blob.arrayBuffer()), w: canvas.width, h: canvas.height });
  }
  return new Blob([assemblePdf(jpegs) as BlobPart], { type: 'application/pdf' });
}

function clip(ctx: CanvasRenderingContext2D, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > width) s = s.slice(0, -1);
  return `${s}…`;
}
