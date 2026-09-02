import type { FieldDef } from '../types';

export function formatFieldValue(field: FieldDef, raw: string | undefined): string {
  if (raw === undefined || raw === '') return '';
  switch (field.type) {
    case 'currency': {
      const n = Number(raw);
      if (Number.isNaN(n)) return raw;
      return `${n.toLocaleString('ko-KR')}원`;
    }
    case 'number': {
      const n = Number(raw);
      if (Number.isNaN(n)) return raw;
      return n.toLocaleString('ko-KR');
    }
    case 'date': {
      // raw is an <input type="date"> value: YYYY-MM-DD
      const d = new Date(`${raw}T00:00:00`);
      if (Number.isNaN(d.getTime())) return raw;
      return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }
    default:
      return raw;
  }
}

export function sumField(field: FieldDef, values: Array<string | undefined>): number | null {
  if (field.type !== 'number' && field.type !== 'currency') return null;
  let total = 0;
  let any = false;
  for (const v of values) {
    if (v === undefined || v === '') continue;
    const n = Number(v);
    if (Number.isNaN(n)) continue;
    total += n;
    any = true;
  }
  return any ? total : null;
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
