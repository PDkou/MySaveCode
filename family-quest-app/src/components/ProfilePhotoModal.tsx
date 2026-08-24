import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { useBackDismiss } from '../lib/backNav';

interface ProfilePhotoModalProps {
  src: string;
  onClose: () => void;
}

// Full-size view of the topbar character slot's photo/mascot -- was a
// read-only viewer (PhotoLightbox) until 2026-08 feedback asked to unify
// status-message editing here instead of SettingsModal's own field: it felt
// disconnected from where the status is actually shown (the topbar slot
// and the family list), and its save-on-blur gave no clear "did this
// actually apply" moment. This is now the one place it's edited, behind an
// explicit Apply button (disabled until the draft actually differs from
// what's saved, and again once it's applied -- that state change is the
// "did this work" feedback, instead of a separate flash message).
//
// Same backdrop/back-button-dismiss convention as the old PhotoLightbox --
// tapping the photo or the dark margin around the card still closes it;
// only the editor block below stops that click from bubbling, so typing or
// tapping Apply doesn't dismiss the modal underneath it.
export function ProfilePhotoModal({ src, onClose }: ProfilePhotoModalProps) {
  const { t } = useTranslation();
  const { profile, updateStatusMessage } = useAuth();
  const { refresh: refreshFamily } = useFamily();
  useBackDismiss(true, onClose);

  const [draft, setDraft] = useState(profile?.status_message ?? '');
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const dirty = draft.trim() !== (profile?.status_message ?? '');

  const handleApply = async () => {
    if (!dirty || busy) return;
    setBusy(true);
    setErrorKey(null);
    try {
      await updateStatusMessage(draft.trim() || null);
      // FamilyContext's own member list is what the family members modal
      // (and anywhere else a status shows for "me" as a member) reads from
      // -- AuthContext's profile update alone doesn't reach it.
      await refreshFamily();
    } catch {
      setErrorKey('auth.error.unknown');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop photo-lightbox-backdrop" onClick={onClose}>
      <div className="profile-photo-card">
        <img src={src} alt="" className="photo-lightbox-image" />
        <div className="profile-status-editor" onClick={(e) => e.stopPropagation()}>
          <div className="settings-field-header">
            <span>{t('profile.statusMessageHeading')}</span>
            <span className="settings-field-counter">{draft.length}/60</span>
          </div>
          <div className="profile-status-editor-row">
            <input
              type="text"
              className="settings-field-input"
              placeholder={t('profile.statusMessagePlaceholder')}
              maxLength={60}
              value={draft}
              disabled={busy}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={!dirty || busy}
              onClick={() => void handleApply()}
            >
              {busy ? t('common.saving') : t('common.apply')}
            </button>
          </div>
          {errorKey && <p className="form-error" role="alert">{t(errorKey)}</p>}
        </div>
      </div>
    </div>
  );
}
