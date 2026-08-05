import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { useFamily, FamilyActionError } from '../context/FamilyContext';
import { ModalHeader } from './ModalHeader';
import { useBackDismiss } from '../lib/backNav';

interface EditFamilyNameModalProps {
  currentName: string;
  onClose: () => void;
}

export function EditFamilyNameModal({ currentName, onClose }: EditFamilyNameModalProps) {
  const { t } = useTranslation();
  const { renameFamily } = useFamily();
  useBackDismiss(true, onClose);

  const [name, setName] = useState(currentName);
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorKey(null);
    setSubmitting(true);
    try {
      await renameFamily(name);
      onClose();
    } catch (err) {
      setErrorKey(err instanceof FamilyActionError ? err.translationKey : 'family.error.unknown');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <ModalHeader title={t('family.editNameHeading')} onClose={onClose} />
        <form onSubmit={handleSubmit} className="form">
          <label className="field">
            <span>{t('family.createNameLabel')}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('family.createNamePlaceholder')}
              maxLength={60}
              autoFocus
            />
          </label>

          {errorKey && <p className="form-error" role="alert">{t(errorKey)}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
