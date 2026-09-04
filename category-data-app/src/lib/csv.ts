import type { Category, Entry, FieldDef } from '../types';
import { getNativeBridge, downloadBlob } from './native';

// UTF-8 byte-order-mark so Excel (still the most common opener for a CSV
// export like this) detects UTF-8 instead of guessing EUC-KR and mangling
// the Korean header/cell text. Built via fromCharCode rather than an
// inline literal so the invisible character can't get silently dropped or
// mangled by an editor/diff along the way.
const UTF8_BOM = String.fromCharCode(0xfeff);

function escapeCsvCell(value: string): string {
  if (/["\n,]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Unlike formatFieldValue (lib/format.ts, used for the PDF/table display
// copy), this keeps number/currency/date cells as their raw stored value
// rather than a formatted display string -- the whole point of a CSV
// export over the existing PDF one is handing the numbers back in a form
// a spreadsheet can recompute with (₩1,000 / 2026.09.04 would just have to
// be re-parsed back out again otherwise).
function csvCellValue(field: FieldDef, raw: string | undefined): string {
  if (raw === undefined) return '';
  if (field.type === 'checkbox') return raw === 'true' ? '1' : '0';
  return raw;
}

export function buildCsv(category: Category, entries: Entry[]): string {
  const header = category.fields.map((f) => escapeCsvCell(f.name)).join(',');
  const rows = entries.map((entry) =>
    category.fields.map((f) => escapeCsvCell(csvCellValue(f, entry.values[f.id]))).join(','),
  );
  return UTF8_BOM + [header, ...rows].join('\r\n');
}

export function csvFilename(categoryName: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${categoryName}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.csv`;
}

export function downloadCsv(csv: string, filename: string): void {
  const native = getNativeBridge();
  if (native) {
    native.exportFile(csv, filename, 'text/csv');
    return;
  }
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename);
}
