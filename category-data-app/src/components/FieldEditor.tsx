import { useState, type ReactNode } from 'react';
import type { Category, FieldDef, FieldType } from '../types';
import { FieldFormModal } from './FieldFormModal';
import { ConfirmDialog } from './ConfirmDialog';
import { TextTypeIcon, HashIcon, CalendarIcon, ListIcon, CheckSquareIcon, StarIcon } from './icons';
import { useI18n } from '../i18n';

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
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [editingField, setEditingField] = useState<FieldDef | null>(null);
  const [addingField, setAddingField] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <section className="field-editor">
      <button type="button" className="section-toggle" onClick={() => setOpen((v) => !v)}>
        <span>{t('fields.manage', { count: category.fields.length })}</span>
        <span className={`chevron ${open ? 'open' : ''}`}>⌄</span>
      </button>

      {open && (
        <div className="field-list">
          {category.fields.length === 0 && <p className="empty-hint">{t('fields.empty')}</p>}
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
                  aria-label={t('common.moveUp')}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn small"
                  disabled={idx === category.fields.length - 1}
                  onClick={() => onMoveField(f.id, 1)}
                  aria-label={t('common.moveDown')}
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-secondary btn-block" onClick={() => setAddingField(true)}>
            {t('fields.add')}
          </button>
        </div>
      )}

      {addingField && (
        <FieldFormModal
          existingNames={category.fields.map((f) => f.name)}
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
          existingNames={category.fields.filter((f) => f.id !== editingField.id).map((f) => f.name)}
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
          title={t('fields.delete')}
          message={t('fields.deleteConfirm')}
          confirmLabel={t('common.delete')}
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
