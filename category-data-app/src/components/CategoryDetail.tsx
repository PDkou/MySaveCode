import { useMemo, useState } from 'react';
import type { AppData, Entry, FieldDef, FieldType } from '../types';
import { FieldEditor } from './FieldEditor';
import { EntryList } from './EntryList';
import { EntryFormModal } from './EntryFormModal';
import { EditCategoryModal } from './EditCategoryModal';
import { ConfirmDialog } from './ConfirmDialog';
import { BackIcon, EditIcon, TrashIcon, TableIcon } from './icons';
import { CategoryEmoji } from './categoryIcons';
import { matchesSearch } from '../lib/search';
import { Toast } from './Toast';

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
  onAddEntry: (values: Record<string, string>, reminders?: Record<string, boolean>) => void;
  onUpdateEntry: (entryId: string, values: Record<string, string>, reminders?: Record<string, boolean>) => void;
  onDeleteEntry: (entryId: string) => void;
  onRestoreEntry: (entry: Entry) => void;
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
  onRestoreEntry,
}: CategoryDetailProps) {
  const category = data.categories.find((c) => c.id === categoryId);
  const [search, setSearch] = useState('');
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [showEditCategory, setShowEditCategory] = useState(false);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState(false);
  const [undoEntry, setUndoEntry] = useState<Entry | null>(null);

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
          <BackIcon />
        </button>
        <h1 className="category-title">
          <CategoryEmoji value={category.emoji} size={20} />
          {category.name}
        </h1>
        <button type="button" className="icon-btn" onClick={() => setShowEditCategory(true)} aria-label="카테고리 편집">
          <EditIcon size={18} />
        </button>
        <button
          type="button"
          className="icon-btn danger"
          onClick={() => setConfirmDeleteCategory(true)}
          aria-label="카테고리 삭제"
        >
          <TrashIcon size={18} />
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
            <TableIcon size={16} />
            표로 보기
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
