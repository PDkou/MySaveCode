import type { Entry, FieldDef } from '../types';

// Sentinel for "checkbox is unchecked" -- the raw stored value for that
// case is '' (see types.ts), which would otherwise be indistinguishable
// from "no filter selected" (also '').
export const UNCHECKED_FILTER_VALUE = '__unchecked__';

export type FieldFilters = Record<string, string>;

// Fields worth offering as filter chips -- select/checkbox are the two
// types with a small, finite set of values a chip row can show at a
// glance. Number/currency/date/text/rating would need a range or
// free-text control instead of chips, which is a different UI.
export function filterableFields(fields: FieldDef[]): FieldDef[] {
  return fields.filter((f) => f.type === 'select' || f.type === 'checkbox');
}

export function matchesFieldFilters(entry: Entry, filters: FieldFilters): boolean {
  for (const [fieldId, want] of Object.entries(filters)) {
    if (!want) continue;
    const raw = entry.values[fieldId] ?? '';
    const matches = want === UNCHECKED_FILTER_VALUE ? !raw : raw === want;
    if (!matches) return false;
  }
  return true;
}
