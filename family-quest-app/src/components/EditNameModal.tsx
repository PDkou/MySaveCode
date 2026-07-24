import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth, AuthActionError } from '../context/AuthContext';

interface EditNameModalProps {
  currentName: string;
  onClose: () => void;
}

export function EditNameModal({ currentName, onClose }: EditNameModalProps) {
  const { t } = useTranslation();
  const { updateDisplayName } = useAuth();

  const [name, setName] = useState(currentName);
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorKey(null);
    setSubmitting(true);
    try {
      await updateDisplayName(name);
      onClose();
    } catch (err) {
      setErrorKey(err instanceof AuthActionError ? err.translationKey : 'auth.error.unknown');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('profile.editNameHeading')}</h2>
        <form onSubmit={handleSubmit} className="form">
          <label className="field">
            <span>{t('auth.displayName')}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('auth.displayNamePlaceholder')}
              maxLength={40}
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
