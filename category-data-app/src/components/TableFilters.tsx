import type { FieldDef } from '../types';
import { UNCHECKED_FILTER_VALUE, type FieldFilters } from '../lib/filter';

interface TableFiltersProps {
  fields: FieldDef[];
  filters: FieldFilters;
  onChange: (fieldId: string, value: string) => void;
}

// Chip rows for the two field types with a small, finite value set
// (select/checkbox) -- see lib/filter.ts. One row per field, each row
// independent (AND'd together in matchesFieldFilters), "전체" clears just
// that field's filter.
export function TableFilters({ fields, filters, onChange }: TableFiltersProps) {
  if (fields.length === 0) return null;

  return (
    <div className="table-filters">
      {fields.map((f) => {
        const options =
          f.type === 'checkbox'
            ? [
                { value: 'true', label: '체크됨' },
                { value: UNCHECKED_FILTER_VALUE, label: '체크 안됨' },
              ]
            : (f.options ?? []).map((o) => ({ value: o, label: o }));
        const active = filters[f.id] ?? '';

        return (
          <div key={f.id} className="table-filter-group">
            <span className="table-filter-label">{f.name}</span>
            <div className="choice-row">
              <button type="button" className={`filter-chip ${!active ? 'selected' : ''}`} onClick={() => onChange(f.id, '')}>
                전체
              </button>
              {options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`filter-chip ${active === o.value ? 'selected' : ''}`}
                  onClick={() => onChange(f.id, active === o.value ? '' : o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
