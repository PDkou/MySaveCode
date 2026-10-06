import { useState } from 'react';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import { StarIcon, CopyIcon, BellIcon, RepeatIcon } from './icons';
import type { Category, Entry, EntryRecurrence, RecurrenceUnit } from '../types';
import { useI18n } from '../i18n';

interface EntryFormModalProps {
  category: Category;
  initial?: Entry;
  onSave: (values: Record<string, string>, reminders: Record<string, boolean>, recurrence?: EntryRecurrence) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onClose: () => void;
}

export function EntryFormModal({ category, initial, onSave, onDelete, onDuplicate, onClose }: EntryFormModalProps) {
  const { t } = useI18n();
  const recurrenceLabels: Record<RecurrenceUnit, string> = {
    weekly: t('recurrence.weekly'),
    monthly: t('recurrence.monthly'),
    yearly: t('recurrence.yearly'),
  };
  const [values, setValues] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const f of category.fields) {
      base[f.id] = initial?.values[f.id] ?? (f.type === 'date' ? '' : '');
    }
    return base;
  });
  const [reminders, setReminders] = useState<Record<string, boolean>>(() => ({ ...initial?.reminders }));
  // Recurrence only makes sense with exactly one date field to anchor a
  // *new* recurrence to -- with zero there's nothing to advance, with
  // two-plus it'd be ambiguous which one recurs. See lib/recurrence.ts
  // for how this plays out once an occurrence comes due.
  //
  // An entry that already has a recurrence keeps editing access to it
  // even if the category later grows a second date field -- otherwise
  // adding an unrelated field would silently turn this entry's
  // recurrence off the next time it's saved (recurrenceField would go
  // null, so submit() below drops it regardless of recurrenceUnit).
  const dateFields = category.fields.filter((f) => f.type === 'date');
  const initialRecurrence = initial?.recurrence;
  const existingAnchorField = initialRecurrence
    ? category.fields.find((f) => f.id === initialRecurrence.anchorFieldId && f.type === 'date')
    : undefined;
  const recurrenceField = existingAnchorField ?? (dateFields.length === 1 ? dateFields[0] : null);
  const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit | ''>(() => initial?.recurrence?.unit ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const setValue = (fieldId: string, v: string) => setValues((prev) => ({ ...prev, [fieldId]: v }));
  const setReminder = (fieldId: string, on: boolean) => setReminders((prev) => ({ ...prev, [fieldId]: on }));

  const missingRequired = category.fields.filter((f) => f.required && !values[f.id]?.trim());
  const canSubmit = missingRequired.length === 0;

  const submit = () => {
    if (!canSubmit) {
      setAttemptedSubmit(true);
      return;
    }
    const recurrence: EntryRecurrence | undefined =
      recurrenceField && recurrenceUnit ? { unit: recurrenceUnit, anchorFieldId: recurrenceField.id } : undefined;
    onSave(values, reminders, recurrence);
  };

  return (
    <Modal
      title={initial ? t('item.edit') : t('item.input', { name: category.name })}
      onClose={onClose}
      footer={
        <>
          {initial && onDuplicate && (
            <button type="button" className="btn btn-secondary" onClick={onDuplicate} aria-label={t('common.duplicate')}>
              <CopyIcon size={16} />
              {t('common.duplicate')}
            </button>
          )}
          {initial && onDelete && (
            <button type="button" className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
              {t('common.delete')}
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={submit}>
            {t('drawer.put')}
          </button>
        </>
      }
    >
      {category.fields.length === 0 && (
        <p className="empty-hint">{t('item.emptyFields')}</p>
      )}
      {category.fields.map((f) => {
        const invalid = attemptedSubmit && f.required && !values[f.id]?.trim();
        return (
          <div key={f.id} className="entry-field">
            <label className="field-label" htmlFor={`entry-${f.id}`}>
              {f.name}
              {f.required && <span className="required-mark">*</span>}
            </label>
            {f.type === 'select' ? (
              <select
                id={`entry-${f.id}`}
                className={`text-input ${invalid ? 'invalid' : ''}`}
                value={values[f.id] ?? ''}
                onChange={(e) => setValue(f.id, e.target.value)}
              >
                <option value="">{t('common.notSelected')}</option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : f.type === 'date' ? (
              <>
                <input
                  id={`entry-${f.id}`}
                  type="date"
                  className={`text-input ${invalid ? 'invalid' : ''}`}
                  value={values[f.id] ?? ''}
                  onChange={(e) => setValue(f.id, e.target.value)}
                />
                {values[f.id] && (
                  <label className="checkbox-row reminder-row">
                    <input
                      type="checkbox"
                      checked={!!reminders[f.id]}
                      onChange={(e) => setReminder(f.id, e.target.checked)}
                    />
                    <BellIcon size={14} />
                    <span>{t('item.reminderShow')}</span>
                  </label>
                )}
              </>
            ) : f.type === 'number' || f.type === 'currency' ? (
              <input
                id={`entry-${f.id}`}
                type="number"
                inputMode="decimal"
                className={`text-input ${invalid ? 'invalid' : ''}`}
                value={values[f.id] ?? ''}
                onChange={(e) => setValue(f.id, e.target.value)}
                placeholder={f.type === 'currency' ? t('item.currencyPlaceholder') : t('item.numberPlaceholder')}
              />
            ) : f.type === 'checkbox' ? (
              <input
                id={`entry-${f.id}`}
                type="checkbox"
                className="entry-checkbox"
                checked={values[f.id] === 'true'}
                onChange={(e) => setValue(f.id, e.target.checked ? 'true' : '')}
              />
            ) : f.type === 'rating' ? (
              <div className="rating-input" role="group" aria-label={f.name}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="rating-star-btn"
                    onClick={() => setValue(f.id, values[f.id] === String(n) ? '' : String(n))}
                    aria-label={t('item.rating', { count: n })}
                    aria-pressed={Number(values[f.id]) >= n}
                  >
                    <StarIcon size={24} filled={Number(values[f.id]) >= n} />
                  </button>
                ))}
              </div>
            ) : (
              <input
                id={`entry-${f.id}`}
                type="text"
                className={`text-input ${invalid ? 'invalid' : ''}`}
                value={values[f.id] ?? ''}
                onChange={(e) => setValue(f.id, e.target.value)}
              />
            )}
          </div>
        );
      })}

      {recurrenceField && (
        <div className="entry-field">
          <span className="field-label">
            <RepeatIcon size={13} /> {t('item.repeatLabel', { name: recurrenceField.name })}
          </span>
          <div className="choice-row wrap">
            <button
              type="button"
              className={`type-choice ${recurrenceUnit === '' ? 'selected' : ''}`}
              onClick={() => setRecurrenceUnit('')}
            >
              {t('common.none')}
            </button>
            {(Object.keys(recurrenceLabels) as RecurrenceUnit[]).map((u) => (
              <button
                key={u}
                type="button"
                className={`type-choice ${recurrenceUnit === u ? 'selected' : ''}`}
                onClick={() => setRecurrenceUnit(u)}
              >
                {recurrenceLabels[u]}
              </button>
            ))}
          </div>
          {recurrenceUnit && (
            <p className="modal-hint">{t('item.repeatHint', { name: recurrenceField.name })}</p>
          )}
        </div>
      )}

      {confirmDelete && onDelete && (
        <ConfirmDialog
          title={t('item.delete')}
          message={t('item.deleteConfirm')}
          confirmLabel={t('common.delete')}
          danger
          onConfirm={onDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </Modal>
  );
}
