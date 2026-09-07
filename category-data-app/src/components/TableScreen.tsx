import { useMemo, useState } from 'react';
import type { Category, Entry, EntryRecurrence } from '../types';
import { DataTable } from './DataTable';
import { EntryFormModal } from './EntryFormModal';
import { PrintView } from './PrintView';
import { Toast } from './Toast';
import { TableFilters } from './TableFilters';
import { CsvImportModal } from './CsvImportModal';
import { getNativeBridge } from '../lib/native';
import { buildCsv, csvFilename, downloadCsv } from '../lib/csv';
import { BackIcon, PdfIcon, DownloadIcon, UploadIcon } from './icons';
import { CategoryEmoji } from './categoryIcons';
import { matchesSearch } from '../lib/search';
import { filterableFields, matchesFieldFilters, type FieldFilters } from '../lib/filter';

interface TableScreenProps {
  category: Category;
  entries: Entry[];
  onBack: () => void;
  onAddEntry: (values: Record<string, string>, reminders?: Record<string, boolean>, recurrence?: EntryRecurrence) => void;
  onAddEntries: (valuesList: Record<string, string>[]) => void;
  onUpdateEntry: (
    entryId: string,
    values: Record<string, string>,
    reminders?: Record<string, boolean>,
    recurrence?: EntryRecurrence,
  ) => void;
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
  onAddEntries,
  onUpdateEntry,
  onDeleteEntry,
  onRestoreEntry,
}: TableScreenProps) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FieldFilters>({});
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [undoEntry, setUndoEntry] = useState<Entry | null>(null);

  const filterFields = useMemo(() => filterableFields(category.fields), [category.fields]);

  const filteredEntries = useMemo(
    () => entries.filter((e) => matchesSearch(e, category.fields, search) && matchesFieldFilters(e, filters)),
    [entries, category.fields, search, filters],
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
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShowCsvImport(true)}
            aria-label="CSV 가져오기"
            disabled={category.fields.length === 0}
          >
            <UploadIcon size={18} />
          </button>
        </div>

        <TableFilters
          fields={filterFields}
          filters={filters}
          onChange={(fieldId, value) => setFilters((prev) => ({ ...prev, [fieldId]: value }))}
        />

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
          onSave={(values, reminders, recurrence) => {
            onAddEntry(values, reminders, recurrence);
            setShowAddEntry(false);
          }}
          onClose={() => setShowAddEntry(false)}
        />
      )}

      {editingEntry && (
        <EntryFormModal
          category={category}
          initial={editingEntry}
          onSave={(values, reminders, recurrence) => {
            onUpdateEntry(editingEntry.id, values, reminders, recurrence);
            setEditingEntry(null);
          }}
          onDuplicate={() => {
            // Recurrence deliberately doesn't carry over -- see
            // CategoryDetail.tsx's own onDuplicate for why.
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

      {showCsvImport && (
        <CsvImportModal category={category} onImport={onAddEntries} onClose={() => setShowCsvImport(false)} />
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
