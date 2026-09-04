import type { Entry, FieldDef } from '../types';

// Plain substring match across every field's raw stored value -- shared by
// CategoryDetail/TableScreen's per-category search box and Home's
// cross-category search overlay (lib/../components/GlobalSearch.tsx) so
// "what counts as a match" stays defined in exactly one place.
export function matchesSearch(entry: Entry, fields: FieldDef[], query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return fields.some((f) => (entry.values[f.id] ?? '').toLowerCase().includes(q));
}
