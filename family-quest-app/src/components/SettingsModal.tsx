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
  const { user, profile, avatarUrl, signOut, updateAvatarPhoto } = useAuth();
  const { family, members, updateMyDisplayName, refresh: refreshFamily } = useFamily();
  const [showEditName, setShowEditName] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErrorKey, setPhotoErrorKey] = useState<string | null>(null);
  // Temporary on-screen diagnostic trail -- remove once the "no reaction
  // after picking a photo" report from a real Android device is diagnosed.
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const addDebugLog = (msg: string) => setDebugLog((prev) => [...prev.slice(-9), msg]);

  const currentName = useMemo(() => {
    if (!user) return '';
    return members.find((m) => m.user_id === user.id)?.display_name || profile?.display_name || '';
  }, [members, user, profile]);

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    try {
      addDebugLog(`onChange fired, files=${event.target.files?.length ?? 0}`);
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) {
        addDebugLog('no file in event, stopping');
        return;
      }
      addDebugLog(`picked: type="${file.type}" size=${file.size} name="${file.name}"`);
      if (!file.type.startsWith('image/')) {
        addDebugLog('rejected: type does not start with image/');
        setPhotoErrorKey('profile.error.photoInvalidType');
        return;
      }
      setPhotoErrorKey(null);
      setPendingPhotoFile(file);
      addDebugLog('setPendingPhotoFile called -- crop modal should open now');
    } catch (err) {
      addDebugLog(`EXCEPTION in handleFileSelected: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleCropConfirm = async (blob: Blob) => {
    addDebugLog(`crop confirmed, blob size=${blob.size}`);
    setPendingPhotoFile(null);
    setPhotoBusy(true);
    try {
      await updateAvatarPhoto(blob);
      addDebugLog('updateAvatarPhoto succeeded');
      // AuthContext only tracks the current user's own profile -- other
      // components (weekly breakdown, task cards, comments) read avatar
      // URLs from FamilyContext's per-member map, which needs its own
      // refresh to pick up the newly uploaded photo.
      await refreshFamily();
      addDebugLog('refreshFamily succeeded');
    } catch (err) {
      addDebugLog(`EXCEPTION in handleCropConfirm: ${err instanceof Error ? err.message : String(err)}`);
      setPhotoErrorKey(err instanceof AvatarPhotoError ? err.translationKey : 'profile.error.photoUploadFailed');
    } finally {
      setPhotoBusy(false);
    }
  };

  const goToHelp = () => {
    onClose();
    navigate('/help');
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
            {/* Temporary diagnostic only: a completely plain, always-visible
                native file input (no label-wrap, no overlay, no hiding at
                all) wired to the same handler, to isolate whether ANY file
                input works at all on this page in the browser that's
                failing, or whether the problem is elsewhere entirely. */}
            <div className="settings-row">
              <span style={{ fontSize: 12 }}>진단용 기본 버튼:</span>
              <input type="file" accept="image/*" onChange={handleFileSelected} />
            </div>
            {debugLog.length > 0 && (
              <pre className="profile-debug-log">
                진단 로그 (스크린샷해서 알려주세요):{'\n'}
                {debugLog.join('\n')}
              </pre>
            )}
            <button type="button" className="settings-row-button" onClick={() => setShowEditName(true)}>
              <span>{t('profile.editNameHeading')}</span>
              <span className="settings-row-value">{currentName}</span>
            </button>
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
