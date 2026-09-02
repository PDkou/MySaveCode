import { useMemo, useState } from 'react';
import type { AppData, Entry, FieldDef, FieldType } from '../types';
import { FieldEditor } from './FieldEditor';
import { EntryList } from './EntryList';
import { EntryFormModal } from './EntryFormModal';
import { EditCategoryModal } from './EditCategoryModal';
import { ConfirmDialog } from './ConfirmDialog';

interface CategoryDetailProps {
  data: AppData;
  categoryId: string;
  onBack: () => void;
  onOpenTable: () => void;
  onUpdateCategory: (patch: { name: string; emoji: string; color: string }) => void;
  onDeleteCategory: () => void;
  onAddField: (field: { name: string; type: FieldType; options?: string[]; required: boolean }) => void;
  onUpdateField: (fieldId: string, patch: Partial<Omit<FieldDef, 'id'>>) => void;
  onRemoveField: (fieldId: string) => void;
  onMoveField: (fieldId: string, direction: -1 | 1) => void;
  onAddEntry: (values: Record<string, string>) => void;
  onUpdateEntry: (entryId: string, values: Record<string, string>) => void;
  onDeleteEntry: (entryId: string) => void;
}

function matchesSearch(entry: Entry, fields: FieldDef[], query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return fields.some((f) => (entry.values[f.id] ?? '').toLowerCase().includes(q));
}

// This screen is for managing the category's shape (fields) and browsing/
// editing entries as a compact list. The full spreadsheet-style table
// (sortable columns, PDF export) lives on its own screen -- see
// TableScreen.tsx, reached via the "표로 보기" button below -- so this
// screen never needs horizontal scrolling on a phone.
export function CategoryDetail({
  data,
  categoryId,
  onBack,
  onOpenTable,
  onUpdateCategory,
  onDeleteCategory,
  onAddField,
  onUpdateField,
  onRemoveField,
  onMoveField,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
}: CategoryDetailProps) {
  const category = data.categories.find((c) => c.id === categoryId);
  const [search, setSearch] = useState('');
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [showEditCategory, setShowEditCategory] = useState(false);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState(false);

  const categoryEntries = useMemo(
    () => data.entries.filter((e) => e.categoryId === categoryId),
    [data.entries, categoryId],
  );

  const filteredEntries = useMemo(
    () => (category ? categoryEntries.filter((e) => matchesSearch(e, category.fields, search)) : []),
    [categoryEntries, category, search],
  );

  if (!category) {
    return (
      <div className="screen">
        <p className="empty-hint">카테고리를 찾을 수 없어요.</p>
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          홈으로
        </button>
      </div>
    );
  }

  return (
    <div className="screen category-screen">
      <header className="app-header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="뒤로">
          ←
        </button>
        <h1 className="category-title">
          {category.emoji} {category.name}
        </h1>
        <button type="button" className="icon-btn" onClick={() => setShowEditCategory(true)} aria-label="카테고리 편집">
          ✏️
        </button>
        <button type="button" className="icon-btn" onClick={() => setConfirmDeleteCategory(true)} aria-label="카테고리 삭제">
          🗑️
        </button>
      </header>

      <div className="screen-content">
        <FieldEditor
          category={category}
          onAddField={onAddField}
          onUpdateField={onUpdateField}
          onRemoveField={onRemoveField}
          onMoveField={onMoveField}
        />

        <div className="table-toolbar">
          <input
            className="text-input search-input"
            placeholder="검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" className="btn btn-secondary" onClick={onOpenTable} disabled={category.fields.length === 0}>
            📊 표로 보기
          </button>
        </div>

        <EntryList fields={category.fields} entries={filteredEntries} onRowClick={(entry) => setEditingEntry(entry)} />
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

      {showEditCategory && (
        <EditCategoryModal
          category={category}
          onSave={(patch) => {
            onUpdateCategory(patch);
            setShowEditCategory(false);
          }}
          onClose={() => setShowEditCategory(false)}
        />
      )}

      {confirmDeleteCategory && (
        <ConfirmDialog
          title="카테고리 삭제"
          message={`"${category.name}" 카테고리와 그 안의 데이터 ${categoryEntries.length}건이 모두 삭제돼요. 계속할까요?`}
          confirmLabel="삭제"
          danger
          onConfirm={() => {
            onDeleteCategory();
          }}
          onCancel={() => setConfirmDeleteCategory(false)}
        />
      )}
    </div>
  );
}
