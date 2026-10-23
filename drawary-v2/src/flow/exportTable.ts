import { formatValue } from './recordForm';
import type { TableColumn, TableRowData } from './tableQuery';
import { t } from '../i18n';

/**
 * Table export (#20's "•••" menu): the rows currently shown, with every column.
 * CSV carries machine-friendly values (ISO dates, plain numbers) so it opens
 * cleanly in a spreadsheet; the PDF (see tablePdf.ts) shows the same text
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
