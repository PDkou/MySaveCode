import { formatValue } from './recordForm';
import { cellText, type TableColumn, type TableRowData } from './tableQuery';
import { t } from '../i18n';

/**
 * Table export (#20's "•••" menu): the rows currently shown, with every column.
 * CSV carries machine-friendly values (ISO dates, plain numbers) so it opens
 * cleanly in a spreadsheet; the printable table (for PDF) shows the same text
 * as the screen.
 */
export function csvCell(col: TableColumn, row: TableRowData): string {
  if (col.type === 'photo') return String(row.photoCount);
  const v = row.values[col.id];
  if (v === undefined || v === null) return '';
  if (col.type === 'checkbox') return formatValue({ kind: 'check' }, v);
  return String(v);
}

/** One CSV field: quoted when needed, and neutered if a spreadsheet would read it as a formula. */
export function csvEscape(raw: string): string {
  let s = raw;
  if (/^[=+\-@\t\r]/.test(s) && !/^[+-]?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** UTF-8 text with a byte-order mark (so Excel reads Korean correctly) and CRLF line ends. */
export function buildCsv(columns: readonly TableColumn[], rows: readonly TableRowData[]): string {
  const lines = [columns.map((c) => csvEscape(c.label)).join(',')];
  for (const row of rows) lines.push(columns.map((c) => csvEscape(csvCell(c, row))).join(','));
  return '﻿' + lines.join('\r\n') + '\r\n';
}

export function exportFileName(drawerName: string, ext: 'csv' | 'pdf', now = new Date()): string {
  const safe = drawerName.replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^_+|_+$/g, '') || t('서랍');
  const d = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `${safe}_${d}.${ext}`;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The table as printable HTML (landscape page, first column bold), for "PDF로 저장". */
export function buildPrintHtml(drawerName: string, columns: readonly TableColumn[], rows: readonly TableRowData[], printedOn: string): string {
  const head = columns.map((c) => `<th>${esc(c.label)}</th>`).join('');
  const body = rows.length
    ? rows.map((r) => `<tr>${columns.map((c, i) => `<td${i === 0 ? ' class="first"' : ''}>${esc(cellText(c, r))}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${Math.max(columns.length, 1)}" class="none">${esc(t('보관품이 없어요.'))}</td></tr>`;
  return `<h1>${esc(drawerName)}</h1><p class="meta">${esc(t('보관품 {n}개', { n: rows.length }))} · ${esc(printedOn)}</p><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}
