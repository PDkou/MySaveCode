import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { ThemeToggle } from './ThemeToggle';
import { ColorThemePicker } from './ColorThemePicker';
import { LanguageSwitch } from './LanguageSwitch';
import { EditNameModal } from './EditNameModal';
import { FamilyMembersModal } from './FamilyMembersModal';
import { PhotoCropModal } from './PhotoCropModal';
import { AvatarChip } from './AvatarChip';
import { AvatarPhotoError } from '../lib/avatarPhotos';

interface SettingsModalProps {
  onClose: () => void;
}

// A single entry point for everything that used to be its own icon
// button scattered across the top bar (theme, color theme, language,
// profile name, logout, help) -- that row had grown to 6-8 buttons as
// features piled up over this project.
export function SettingsModal({ onClose }: SettingsModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile, avatarUrl, signOut, updateAvatarPhoto, updateBirthday } = useAuth();
  const { family, members, updateMyDisplayName, refresh: refreshFamily } = useFamily();
  const [showEditName, setShowEditName] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErrorKey, setPhotoErrorKey] = useState<string | null>(null);
  const [birthdayBusy, setBirthdayBusy] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const currentName = useMemo(() => {
    if (!user) return '';
    return members.find((m) => m.user_id === user.id)?.display_name || profile?.display_name || '';
  }, [members, user, profile]);

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoErrorKey('profile.error.photoInvalidType');
      return;
    }
    setPhotoErrorKey(null);
    setPendingPhotoFile(file);
  };

  const handleCropConfirm = async (blob: Blob) => {
    setPendingPhotoFile(null);
    setPhotoBusy(true);
    try {
      await updateAvatarPhoto(blob);
      // AuthContext only tracks the current user's own profile -- other
      // components (weekly breakdown, task cards, comments) read avatar
      // URLs from FamilyContext's per-member map, which needs its own
      // refresh to pick up the newly uploaded photo.
      await refreshFamily();
    } catch (err) {
      setPhotoErrorKey(err instanceof AvatarPhotoError ? err.translationKey : 'profile.error.photoUploadFailed');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleCopyInviteCode = async () => {
    if (!family) return;
    try {
      await navigator.clipboard.writeText(family.invite_code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1500);
    } catch {
      // Clipboard API can be unavailable (older iOS Safari without a user
      // gesture context); the code is still visible on screen to copy by hand.
    }
  };

  const goToHelp = () => {
    onClose();
    navigate('/help');
  };

  const handleBirthdayChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value || null;
    setBirthdayBusy(true);
    try {
      await updateBirthday(value);
    } catch {
      // updateBirthday only fails on a real network/DB error -- the input
      // simply reverts to profile.birthday below since the optimistic
      // setProfile update never happened.
    } finally {
      setBirthdayBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('settings.heading')}</h2>

        <div className="settings-section">
          <p className="settings-section-title">{t('settings.appearance')}</p>
          <div className="settings-row">
            <span>{t('theme.toggle')}</span>
            <ThemeToggle />
          </div>
          <div className="settings-row">
            <span>{t('colorTheme.label')}</span>
            <ColorThemePicker />
          </div>
          <div className="settings-row">
            <span>{t('language.label')}</span>
            <LanguageSwitch />
          </div>
        </div>

        {user && (
          <div className="settings-section">
            <p className="settings-section-title">{t('settings.account')}</p>
            <div className="settings-row">
              <span>{t('profile.photoHeading')}</span>
              {/* A <label> wrapping the <input> directly, rather than a
                  separate button calling inputRef.current.click(), is the
                  more broadly-compatible pattern for custom-styled file
                  pickers. The input itself is a full-size, fully
                  transparent overlay (not clipped down to 1px via
                  .visually-hidden) -- confirmed some Chromium-based mobile
                  browsers (Samsung Internet reproduced directly, not just
                  the installed-app cache) never fire the file input's
                  change event once it's clipped that small, even though
                  the native picker still opens and completes normally. */}
              <label className={`settings-photo-trigger ${photoBusy ? 'settings-photo-trigger-disabled' : ''}`}>
                <AvatarChip name={currentName} size={40} photoUrl={avatarUrl} />
                <span className="settings-photo-trigger-label">
                  {photoBusy ? t('profile.photoUploading') : t('profile.photoChange')}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="file-input-overlay"
                  onChange={handleFileSelected}
                  disabled={photoBusy}
                />
              </label>
            </div>
            {photoErrorKey && <p className="form-error" role="alert">{t(photoErrorKey)}</p>}
            <button type="button" className="settings-row-button" onClick={() => setShowEditName(true)}>
              <span>{t('profile.editNameHeading')}</span>
              <span className="settings-row-value">{currentName}</span>
            </button>
            <div className="settings-row">
              <span>{t('profile.birthdayHeading')}</span>
              <input
                type="date"
                className="settings-date-input"
                value={profile?.birthday ?? ''}
                disabled={birthdayBusy}
                onChange={(e) => void handleBirthdayChange(e)}
              />
            </div>
            <p className="settings-row-hint">{t('profile.birthdayHint')}</p>
            {family && (
              <button type="button" className="settings-row-button" onClick={() => void handleCopyInviteCode()}>
                <span>{t('family.inviteCodeLabel')}</span>
                <span className="settings-row-value">
                  {family.invite_code} {codeCopied ? `(${t('common.copied')})` : ''}
                </span>
              </button>
            )}
            {family && (
              <button type="button" className="settings-row-button" onClick={() => setShowMembers(true)}>
                {t('family.membersHeading')}
              </button>
            )}
            <button
              type="button"
              className="settings-row-button settings-row-danger"
              onClick={() => void signOut()}
            >
              {t('auth.logout')}
            </button>
          </div>
        )}

        <div className="settings-section">
          <button type="button" className="settings-row-button" onClick={goToHelp}>
            {t('help.openButton')}
          </button>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>

      {showEditName && (
        <EditNameModal
          currentName={currentName}
          onSave={updateMyDisplayName}
          onClose={() => setShowEditName(false)}
        />
      )}

      {showMembers && <FamilyMembersModal onClose={() => setShowMembers(false)} />}

      {pendingPhotoFile && (
        <PhotoCropModal
          file={pendingPhotoFile}
          onCancel={() => setPendingPhotoFile(null)}
          onConfirm={(blob) => void handleCropConfirm(blob)}
        />
      )}
    </div>
  );
}
