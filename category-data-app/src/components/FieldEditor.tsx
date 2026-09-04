import { useState, type ReactNode } from 'react';
import type { Category, FieldDef, FieldType } from '../types';
import { FieldFormModal } from './FieldFormModal';
import { ConfirmDialog } from './ConfirmDialog';
import { TextTypeIcon, HashIcon, CalendarIcon, ListIcon, CheckSquareIcon, StarIcon } from './icons';

// currency doesn't get a drawn icon -- the won sign reads instantly to
// this app's audience and a generic coin/dollar glyph would say less
// than the character itself does.
const TYPE_ICONS: Record<FieldType, ReactNode> = {
  text: <TextTypeIcon size={16} />,
  number: <HashIcon size={16} />,
  currency: '₩',
  date: <CalendarIcon size={16} />,
  select: <ListIcon size={16} />,
  checkbox: <CheckSquareIcon size={16} />,
  rating: <StarIcon size={16} filled />,
};

interface FieldEditorProps {
  category: Category;
  onAddField: (field: { name: string; type: FieldType; options?: string[]; required: boolean }) => void;
  onUpdateField: (fieldId: string, patch: Partial<Omit<FieldDef, 'id'>>) => void;
  onRemoveField: (fieldId: string) => void;
  onMoveField: (fieldId: string, direction: -1 | 1) => void;
}

export function FieldEditor({ category, onAddField, onUpdateField, onRemoveField, onMoveField }: FieldEditorProps) {
  const [open, setOpen] = useState(false);
  const [editingField, setEditingField] = useState<FieldDef | null>(null);
  const [addingField, setAddingField] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <section className="field-editor">
      <button type="button" className="section-toggle" onClick={() => setOpen((v) => !v)}>
        <span>필드 관리 ({category.fields.length}개)</span>
        <span className={`chevron ${open ? 'open' : ''}`}>⌄</span>
      </button>

      {open && (
        <div className="field-list">
          {category.fields.length === 0 && <p className="empty-hint">아직 항목이 없어요. 항목을 추가해 데이터 입력 양식을 만들어 보세요.</p>}
          {category.fields.map((f, idx) => (
            <div key={f.id} className="field-row">
              <span className="field-row-icon">{TYPE_ICONS[f.type]}</span>
              <button type="button" className="field-row-main" onClick={() => setEditingField(f)}>
                <span className="field-row-name">
                  {f.name}
                  {f.required && <span className="required-mark">*</span>}
                </span>
                {f.type === 'select' && f.options && <span className="field-row-sub">{f.options.join(' · ')}</span>}
              </button>
              <div className="field-row-actions">
                <button
                  type="button"
                  className="icon-btn small"
                  disabled={idx === 0}
                  onClick={() => onMoveField(f.id, -1)}
                  aria-label="위로 이동"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn small"
                  disabled={idx === category.fields.length - 1}
                  onClick={() => onMoveField(f.id, 1)}
                  aria-label="아래로 이동"
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-secondary btn-block" onClick={() => setAddingField(true)}>
            + 항목 추가
          </button>
        </div>
      )}

      {addingField && (
        <FieldFormModal
          onSave={(field) => {
            onAddField(field);
            setAddingField(false);
          }}
          onClose={() => setAddingField(false)}
        />
      )}

      {editingField && (
        <FieldFormModal
          initial={editingField}
          onSave={(patch) => {
            onUpdateField(editingField.id, patch);
            setEditingField(null);
          }}
          onDelete={() => {
            setConfirmDeleteId(editingField.id);
            setEditingField(null);
          }}
          onClose={() => setEditingField(null)}
        />
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title="항목 삭제"
          message="이 항목을 삭제하면 표에서 해당 열이 사라져요. 기존에 입력된 값은 다른 항목에 영향을 주지 않아요. 계속할까요?"
          confirmLabel="삭제"
          danger
          onConfirm={() => {
            onRemoveField(confirmDeleteId);
            setConfirmDeleteId(null);
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </section>
  );
}
