import { useMemo, useState } from 'react';
import type { Category, Entry } from '../types';
import { DataTable } from './DataTable';
import { EntryFormModal } from './EntryFormModal';
import { PrintView } from './PrintView';
import { Toast } from './Toast';
import { getNativeBridge } from '../lib/native';
import { buildCsv, csvFilename, downloadCsv } from '../lib/csv';
import { BackIcon, PdfIcon, DownloadIcon } from './icons';
import { CategoryEmoji } from './categoryIcons';
import { matchesSearch } from '../lib/search';

interface TableScreenProps {
  category: Category;
  entries: Entry[];
  onBack: () => void;
  onAddEntry: (values: Record<string, string>, reminders?: Record<string, boolean>) => void;
  onUpdateEntry: (entryId: string, values: Record<string, string>, reminders?: Record<string, boolean>) => void;
  onDeleteEntry: (entryId: string) => void;
  onRestoreEntry: (entry: Entry) => void;
}

// The full multi-column table on its own screen -- gets the whole viewport
// (no field editor competing for space) so it has real room to breathe,
// especially in landscape/tablet where several columns can fit without
// horizontal scrolling. Reached from CategoryDetail's "표로 보기" button.
export function TableScreen({
  category,
  entries,
  onBack,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onRestoreEntry,
}: TableScreenProps) {
  const [search, setSearch] = useState('');
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [undoEntry, setUndoEntry] = useState<Entry | null>(null);

  const filteredEntries = useMemo(
    () => entries.filter((e) => matchesSearch(e, category.fields, search)),
    [entries, category.fields, search],
  );

  return (
    <div className="screen table-screen">
      <header className="app-header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="뒤로">
          <BackIcon />
        </button>
        <h1 className="category-title">
          <CategoryEmoji value={category.emoji} size={20} />
          {category.name} · 표
        </h1>
        <button
          type="button"
          className="icon-btn"
          onClick={() => downloadCsv(buildCsv(category, filteredEntries), csvFilename(category.name))}
          aria-label="CSV로 내보내기"
          disabled={entries.length === 0}
        >
          <DownloadIcon size={18} />
        </button>
        <button
          type="button"
          className="icon-btn"
          // window.print() has no built-in effect inside the native
          // wrapper's bare WebView -- printPage() there hands off to
          // Android's own PrintManager instead (see MainActivity.java).
          onClick={() => {
            const native = getNativeBridge();
            if (native) native.printPage();
            else window.print();
          }}
          aria-label="PDF로 내보내기"
          disabled={entries.length === 0}
        >
          <PdfIcon size={18} />
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
          onSave={(values, reminders) => {
            onAddEntry(values, reminders);
            setShowAddEntry(false);
          }}
          onClose={() => setShowAddEntry(false)}
        />
      )}

      {editingEntry && (
        <EntryFormModal
          category={category}
          initial={editingEntry}
          onSave={(values, reminders) => {
            onUpdateEntry(editingEntry.id, values, reminders);
            setEditingEntry(null);
          }}
          onDuplicate={() => {
            onAddEntry({ ...editingEntry.values }, editingEntry.reminders);
            setEditingEntry(null);
          }}
          onDelete={() => {
            onDeleteEntry(editingEntry.id);
            setUndoEntry(editingEntry);
            setEditingEntry(null);
          }}
          onClose={() => setEditingEntry(null)}
        />
      )}

      {undoEntry && (
        <Toast
          message="삭제됨"
          actionLabel="되돌리기"
          onAction={() => {
            onRestoreEntry(undoEntry);
            setUndoEntry(null);
          }}
          onDismiss={() => setUndoEntry(null)}
        />
      )}

      <PrintView category={category} entries={filteredEntries} />
    </div>
  );
}
