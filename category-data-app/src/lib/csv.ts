import type { Category, Entry, FieldDef } from '../types';
import { getNativeBridge, downloadBlob } from './native';

// UTF-8 byte-order-mark so Excel (still the most common opener for a CSV
// export like this) detects UTF-8 instead of guessing EUC-KR and mangling
// the Korean header/cell text. Built via fromCharCode rather than an
// inline literal so the invisible character can't get silently dropped or
// mangled by an editor/diff along the way.
const UTF8_BOM = String.fromCharCode(0xfeff);

function escapeCsvCell(value: string): string {
  // \r alone (not just \n) needs quoting too -- rows below are joined
  // with \r\n, so an unquoted stray \r inside a value reads as a row
  // break to a spreadsheet re-opening the file.
  if (/["\n\r,]/.test(value)) {
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

// ---------- CSV import ----------

// A small hand-written RFC4180-ish parser (quoted fields, "" as an
// escaped quote, quoted fields spanning embedded commas/newlines) rather
// than a dependency -- this only ever needs to read back what buildCsv()
// above writes (or a plain spreadsheet export shaped like it), not
// arbitrary CSV in the wild.
export function parseCsv(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < len) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      pushField();
      i++;
      continue;
    }
    if (c === '\r') {
      i++;
      continue;
    }
    if (c === '\n') {
      pushRow();
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length > 0 || row.length > 0) pushRow();

  // A trailing newline produces one wholly-empty row -- drop it rather
  // than importing it as a blank entry.
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

// Returns the value to store plus whether the cell had to be dropped as
// unparseable, so the caller can warn rather than silently corrupt a
// number/currency field's totals and sort order.
function fieldValueFromCsvCell(field: FieldDef, cell: string): { value: string; invalid: boolean } {
  if (field.type === 'checkbox') {
    const v = cell.trim().toLowerCase();
    return { value: v === '1' || v === 'true' ? 'true' : '', invalid: false };
  }
  if (field.type === 'number' || field.type === 'currency') {
    const trimmed = cell.trim();
    if (trimmed === '') return { value: '', invalid: false };
    // A spreadsheet commonly re-renders an exported "15000" as "15,000"
    // or "₩15,000" -- strip thousands separators/currency marks so the
    // round-trip export-edit-reimport case still parses, but still
    // reject genuine garbage rather than storing it verbatim (lib/format.ts's
    // sumField and DataTable's sort both assume Number(value) is valid).
    const normalized = trimmed.replace(/[₩$,\s]/g, '');
    if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
      return { value: '', invalid: true };
    }
    return { value: normalized, invalid: false };
  }
  return { value: cell, invalid: false };
}

export interface CsvImportResult {
  entries: Record<string, string>[];
  matchedColumns: number;
  totalColumns: number;
  invalidCells: number;
}

// Maps CSV columns to this category's fields by exact header-name match
// (the same names buildCsv() writes) -- an unmatched column is ignored,
// a field absent from the CSV is just left blank on every imported row.
// No manual column-mapping UI: the common case this serves is "exported
// this category's own CSV, edited it in a spreadsheet, re-importing it",
// where the headers already line up.
export function parseCsvForCategory(category: Category, text: string): CsvImportResult {
  const rows = parseCsv(text);
  if (rows.length === 0) return { entries: [], matchedColumns: 0, totalColumns: 0, invalidCells: 0 };

  const header = rows[0].map((h) => h.trim());
  // FieldFormModal blocks creating a second field with the same name,
  // but a category created before that check (or a hand-edited backup)
  // could still have a duplicate -- treat a name that matches more than
  // one field as unmatched rather than guessing which field the column
  // meant, silently leaving the other one blank on every row.
  const columnFields = header.map((h) => {
    const matches = category.fields.filter((f) => f.name === h);
    return matches.length === 1 ? matches[0] : null;
  });
  const matchedColumns = columnFields.filter(Boolean).length;

  let invalidCells = 0;
  const entries = rows
    .slice(1)
    .filter((r) => r.some((cell) => cell.trim() !== ''))
    .map((r) => {
      const values: Record<string, string> = {};
      columnFields.forEach((field, idx) => {
        if (!field) return;
        const { value, invalid } = fieldValueFromCsvCell(field, r[idx] ?? '');
        if (invalid) invalidCells++;
        values[field.id] = value;
      });
      return values;
    });

  return { entries, matchedColumns, totalColumns: header.length, invalidCells };
}
