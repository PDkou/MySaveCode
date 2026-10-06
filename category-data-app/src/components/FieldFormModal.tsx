import { useState } from 'react';
import { Modal } from './Modal';
import type { FieldDef, FieldType } from '../types';
import { useI18n } from '../i18n';

interface FieldFormModalProps {
  initial?: FieldDef;
  // Other fields' names in this category (excluding this field's own, when
  // editing) -- CSV import matches columns to fields by name alone
  // (lib/csv.ts), so two fields sharing a name makes that match ambiguous
  // and one of them silently never gets imported into. See FieldEditor.
  existingNames: string[];
  onSave: (field: { name: string; type: FieldType; options?: string[]; required: boolean }) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function FieldFormModal({ initial, existingNames, onSave, onDelete, onClose }: FieldFormModalProps) {
  const { t } = useI18n();
  const typeLabels: Record<FieldType, string> = {
    text: t('fields.text'),
    number: t('fields.number'),
    currency: t('fields.currency'),
    date: t('fields.date'),
    select: t('fields.select'),
    checkbox: t('fields.checkbox'),
    rating: t('fields.rating'),
  };
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<FieldType>(initial?.type ?? 'text');
  const [optionsText, setOptionsText] = useState((initial?.options ?? []).join(', '));
  const [required, setRequired] = useState(initial?.required ?? false);

  const trimmedName = name.trim();
  const isDuplicateName = existingNames.some((n) => n.toLowerCase() === trimmedName.toLowerCase());
  const canSubmit = trimmedName.length > 0 && !isDuplicateName && (type !== 'select' || optionsText.trim().length > 0);

  const submit = () => {
    if (!canSubmit) return;
    const options =
      type === 'select'
        ? optionsText
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean)
        : undefined;
    onSave({ name: name.trim(), type, options, required });
  };

  return (
    <Modal
      title={initial ? t('fields.edit') : t('fields.add').replace(/^\+\s*/, '')}
      onClose={onClose}
      footer={
        <>
          {initial && onDelete && (
            <button type="button" className="btn btn-danger" onClick={onDelete}>
              {t('common.delete')}
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={submit} disabled={!canSubmit}>
            {t('common.save')}
          </button>
        </>
      }
    >
      <label className="field-label" htmlFor="field-name">
        {t('fields.name')}
      </label>
      <input
        id="field-name"
        className={`text-input ${isDuplicateName ? 'invalid' : ''}`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('fields.nameExample')}
        autoFocus
      />
      {isDuplicateName && <p className="error-hint">{t('fields.duplicateName')}</p>}

      <span className="field-label">{t('fields.type')}</span>
      <div className="choice-row wrap">
        {(Object.keys(typeLabels) as FieldType[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`type-choice ${type === t ? 'selected' : ''}`}
            onClick={() => setType(t)}
          >
            {typeLabels[t]}
          </button>
        ))}
      </div>

      {type === 'select' && (
        <>
          <label className="field-label" htmlFor="field-options">
            {t('fields.options')}
          </label>
          <input
            id="field-options"
            className="text-input"
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            placeholder={t('fields.optionsExample')}
          />
        </>
      )}

      <label className="checkbox-row">
        <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
        <span>{t('fields.required')}</span>
      </label>
    </Modal>
  );
}
