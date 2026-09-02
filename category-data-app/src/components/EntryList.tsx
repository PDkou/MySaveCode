import type { Entry, FieldDef } from '../types';
import { formatFieldValue } from '../lib/format';

interface EntryListProps {
  fields: FieldDef[];
  entries: Entry[];
  onRowClick: (entry: Entry) => void;
}

// A compact, scroll-free summary of each entry -- used on the category
// management screen instead of the full multi-column table (that lives on
// its own screen now, see TableScreen.tsx) so this screen never needs
// horizontal scrolling on a phone.
function summarize(fields: FieldDef[], entry: Entry): string {
  const parts = fields
    .slice(0, 3)
    .map((f) => formatFieldValue(f, entry.values[f.id]))
    .filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : '(빈 데이터)';
}

export function EntryList({ fields, entries, onRowClick }: EntryListProps) {
  if (fields.length === 0) {
    return <p className="empty-hint">먼저 "필드 관리"에서 이 카테고리의 항목을 설정해 주세요.</p>;
  }
  if (entries.length === 0) {
    return <p className="empty-hint">아직 입력된 데이터가 없어요. 오른쪽 아래 + 버튼으로 데이터를 추가해 보세요.</p>;
  }
  return (
    <ul className="entry-list">
      {entries.map((entry) => (
        <li key={entry.id}>
          <button type="button" className="entry-list-row" onClick={() => onRowClick(entry)}>
            <span className="entry-list-summary">{summarize(fields, entry)}</span>
            <span className="entry-list-chevron">›</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
