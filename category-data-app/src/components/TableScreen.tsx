import { useMemo, useState } from 'react';
import type { Category, Entry } from '../types';
import { DataTable } from './DataTable';
import { EntryFormModal } from './EntryFormModal';
import { PrintView } from './PrintView';

interface TableScreenProps {
  category: Category;
  entries: Entry[];
  onBack: () => void;
  onAddEntry: (values: Record<string, string>) => void;
  onUpdateEntry: (entryId: string, values: Record<string, string>) => void;
  onDeleteEntry: (entryId: string) => void;
}

function matchesSearch(entry: Entry, fields: Category['fields'], query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return fields.some((f) => (entry.values[f.id] ?? '').toLowerCase().includes(q));
}

// The full multi-column table on its own screen -- gets the whole viewport
// (no field editor competing for space) so it has real room to breathe,
// especially in landscape/tablet where several columns can fit without
// horizontal scrolling. Reached from CategoryDetail's "표로 보기" button.
export function TableScreen({ category, entries, onBack, onAddEntry, onUpdateEntry, onDeleteEntry }: TableScreenProps) {
  const [search, setSearch] = useState('');
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  const filteredEntries = useMemo(
    () => entries.filter((e) => matchesSearch(e, category.fields, search)),
    [entries, category.fields, search],
  );

  return (
    <div className="screen table-screen">
      <header className="app-header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="뒤로">
          ←
        </button>
        <h1 className="category-title">
          {category.emoji} {category.name} · 표
        </h1>
        <button type="button" className="icon-btn" onClick={() => window.print()} aria-label="PDF로 내보내기" disabled={entries.length === 0}>
          📄
        </button>
      </header>

      <div className="screen-content">
        <div className="table-toolbar">
          <input
            className="text-input search-input"
            placeholder="검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <DataTable fields={category.fields} entries={filteredEntries} onRowClick={(entry) => setEditingEntry(entry)} />
      </div>

      <button
        type="button"
        className="fab"
        onClick={() => setShowAddEntry(true)}
        aria-label="데이터 추가"
        disabled={category.fields.length === 0}
      >
        +
      </button>

      {showAddEntry && (
        <EntryFormModal
          category={category}
          onSave={(values) => {
            onAddEntry(values);
            setShowAddEntry(false);
          }}
          onClose={() => setShowAddEntry(false)}
        />
      )}

      {editingEntry && (
        <EntryFormModal
          category={category}
          initial={editingEntry}
          onSave={(values) => {
            onUpdateEntry(editingEntry.id, values);
            setEditingEntry(null);
          }}
          onDelete={() => {
            onDeleteEntry(editingEntry.id);
            setEditingEntry(null);
          }}
          onClose={() => setEditingEntry(null)}
        />
      )}

      <PrintView category={category} entries={filteredEntries} />
    </div>
  );
}
