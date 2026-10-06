import type { Entry, FieldDef } from '../types';
import { formatFieldValue } from '../lib/format';
import { useI18n } from '../i18n';

interface EntryListProps {
  fields: FieldDef[];
  entries: Entry[];
  onRowClick: (entry: Entry) => void;
}

// A compact, scroll-free summary of each entry -- used on the category
// management screen instead of the full multi-column table (that lives on
// its own screen now, see TableScreen.tsx) so this screen never needs
// horizontal scrolling on a phone.
function summarize(fields: FieldDef[], entry: Entry, emptyLabel: string): string {
  const parts = fields
    .slice(0, 3)
    .map((f) => formatFieldValue(f, entry.values[f.id]))
    .filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : emptyLabel;
}

export function EntryList({ fields, entries, onRowClick }: EntryListProps) {
  const { t } = useI18n();
  if (fields.length === 0) {
    return <p className="empty-hint">{t('item.emptyFields')}</p>;
  }
  if (entries.length === 0) {
    return <p className="empty-hint">{t('item.emptyItems')}</p>;
  }
  return (
    <ul className="entry-list">
      {entries.map((entry) => (
        <li key={entry.id}>
          <button type="button" className="entry-list-row" onClick={() => onRowClick(entry)}>
            <span className="entry-list-summary">{summarize(fields, entry, t('item.empty'))}</span>
            <span className="entry-list-chevron">›</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
