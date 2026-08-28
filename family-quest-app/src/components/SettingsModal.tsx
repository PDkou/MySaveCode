import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

import { useAuth, AuthActionError } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { ThemeToggle } from './ThemeToggle';
import { ColorThemePicker } from './ColorThemePicker';
import { LanguageSwitch } from './LanguageSwitch';
import { EditNameModal } from './EditNameModal';
import { FamilyMembersModal } from './FamilyMembersModal';
import { PhotoCropModal } from './PhotoCropModal';
import { OnboardingScreen } from './OnboardingScreen';
import { ConfirmModal } from './ConfirmModal';
import { ModalHeader } from './ModalHeader';
import { AvatarChip } from './AvatarChip';
import { AvatarPhotoError } from '../lib/avatarPhotos';
import { useBackDismiss } from '../lib/backNav';
import { SUPPORT_EMAIL } from '../lib/constants';
import { purchaseRemoveAds } from '../lib/purchases';

interface SettingsModalProps {
  onClose: () => void;
  // Only meaningful when SettingsModal is opened from the dashboard, where
  // TutorialTour's spotlighted elements actually exist -- FamilySetupPage
  // (before a family exists) also renders this modal and omits it, so the
  // "튜토리얼 다시보기" row only appears where replaying it makes sense.
  onReplayTutorial?: () => void;
}

// A single entry point for everything that used to be its own icon
// button scattered across the top bar (theme, color theme, language,
// profile name, logout, help) -- that row had grown to 6-8 buttons as
// features piled up over this project.
export function SettingsModal({ onClose, onReplayTutorial }: SettingsModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    user, profile, avatarUrl, signOut, updateAvatarPhoto, removeAvatarPhoto, updateBirthday, requestAccountDeletion,
  } = useAuth();
  const { family, members, updateMyDisplayName, refresh: refreshFamily } = useFamily();
  useBackDismiss(true, onClose);
  const [showEditName, setShowEditName] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErrorKey, setPhotoErrorKey] = useState<string | null>(null);
  const [birthdayBusy, setBirthdayBusy] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [adsRemovalBusy, setAdsRemovalBusy] = useState(false);
  const [adsRemovalErrorKey, setAdsRemovalErrorKey] = useState<string | null>(null);
  const [adsRemovalMessage, setAdsRemovalMessage] = useState<string | null>(null);
  const [showOnboardingPreview, setShowOnboardingPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErrorKey, setDeleteErrorKey] = useState<string | null>(null);

  // EditNameModal/FamilyMembersModal/PhotoCropModal/the delete-account
  // ConfirmModal are only ever opened from here -- each renders its own
  // .modal-backdrop, so having this modal's backdrop stay visible
  // underneath stacked two translucent bottom sheets with double-dimmed
  // backgrounds and this modal's own sheet visibly peeking out above the
  // shorter child sheet. Hiding (not unmounting, so none of this modal's
  // own local state resets) this modal's chrome while a child is open
  // avoids that.
  const childModalOpen = showEditName || showMembers || !!pendingPhotoFile || showDeleteConfirm;

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

  // 2026-08 feedback: photo could be changed but never unset. A no-op if
  // there's nothing to remove (button is hidden in that case anyway, see
  // the JSX below), so no separate guard needed here.
  const handleRemovePhoto = async () => {
    setPhotoBusy(true);
    setPhotoErrorKey(null);
    try {
      await removeAvatarPhoto();
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

  const handleRemoveAds = async () => {
    if (!family) return;
    setAdsRemovalBusy(true);
    setAdsRemovalErrorKey(null);
    setAdsRemovalMessage(null);
    try {
      await purchaseRemoveAds(family.id);
      // families.ads_removed only flips once the RevenueCat webhook lands
      // server-side (lib/purchases.ts) -- not instantly reflected here, so
      // this is a "purchase started" message, not a "done" one. refreshFamily
      // picks up the real flag next time this modal (or the dashboard) loads.
      setAdsRemovalMessage(t('settings.removeAdsPurchasePending'));
    } catch {
      // Button is only rendered on native platforms in the first place, so
      // in practice this is always a real store-side failure (offering
      // misconfigured, user cancelled, network) rather than PurchaseError's
      // "web" case -- one generic message covers all of those.
      setAdsRemovalErrorKey('settings.error.removeAdsFailed');
    } finally {
      setAdsRemovalBusy(false);
    }
  };

  const goToHelp = () => {
    onClose();
    navigate('/help');
  };

  const goToPrivacyPolicy = () => {
    onClose();
    navigate('/privacy');
  };

  const goToTermsOfService = () => {
    onClose();
    navigate('/terms');
  };

  // Actually anonymizing/banning the account happens 7 days from now, not
  // here -- see schema.sql section 43's own comment. Closes the confirm
  // dialog immediately either way (same pattern as FamilyMembersModal's own
  // handleLeave/handleRemove) -- any error shows in this modal's own body
  // afterward, not inside ConfirmModal itself. On success, closes Settings
  // too; App.tsx's RootGate reactively swaps to
  // AccountDeletionPendingScreen the moment profile.deletion_requested_at
  // is set, so there's nothing else to navigate to.
  const handleDeleteAccount = async () => {
    setShowDeleteConfirm(false);
    setDeleteBusy(true);
    setDeleteErrorKey(null);
    try {
      await requestAccountDeletion();
      onClose();
    } catch (err) {
      setDeleteErrorKey(err instanceof AuthActionError ? err.translationKey : 'auth.error.unknown');
    } finally {
      setDeleteBusy(false);
    }
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
    <div className={`modal-backdrop ${childModalOpen ? 'modal-backdrop-hidden' : ''}`} onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <ModalHeader title={t('settings.heading')} onClose={onClose} />

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
              <div className="settings-photo-actions">
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
                {avatarUrl && (
                  <button
                    type="button"
                    className="settings-photo-remove"
                    disabled={photoBusy}
                    onClick={() => void handleRemovePhoto()}
                  >
                    {t('profile.photoRemove')}
                  </button>
                )}
              </div>
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
            {/* Status message editing lives in ProfilePhotoModal now (2026-08
                feedback: consolidated to the one place it's edited, opened
                by tapping the topbar character slot's photo) -- no longer
                duplicated here. */}
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
            {/* room_type check also naturally excludes business-quest-app,
                which never creates room_type='family' rooms -- that side
                monetizes as a B2B subscription instead (MONETIZATION_DESIGN.md
                section 2), not ads. Hidden on web/PWA too since there's no
                store to purchase through there. */}
            {Capacitor.isNativePlatform() && family && family.room_type === 'family' && !family.ads_removed && (
              <>
                <button
                  type="button"
                  className="settings-row-button"
                  disabled={adsRemovalBusy}
                  onClick={() => void handleRemoveAds()}
                >
                  {adsRemovalBusy ? t('common.saving') : t('settings.removeAds')}
                </button>
                <p className="settings-row-hint">{t('settings.removeAdsHint')}</p>
                {adsRemovalMessage && <p className="form-info" role="status">{adsRemovalMessage}</p>}
                {adsRemovalErrorKey && <p className="form-error" role="alert">{t(adsRemovalErrorKey)}</p>}
              </>
            )}
            <button
              type="button"
              className="settings-row-button settings-row-danger"
              onClick={() => void signOut()}
            >
              {t('auth.logout')}
            </button>
            <button
              type="button"
              className="settings-row-button settings-row-danger"
              disabled={deleteBusy}
              onClick={() => setShowDeleteConfirm(true)}
            >
              {t('profile.deleteAccount')}
            </button>
            {deleteErrorKey && <p className="form-error" role="alert">{t(deleteErrorKey)}</p>}
          </div>
        )}

        <div className="settings-section">
          <button type="button" className="settings-row-button" onClick={goToHelp}>
            {t('help.openButton')}
          </button>
          {/* mailto:, not an in-app form -- no backend for inquiries exists
              (2026-08 feedback: there was no contact channel in the app at
              all). A plain link is enough for now; revisit if volume ever
              justifies a real support inbox/ticketing flow. */}
          <a
            className="settings-row-button"
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`[${t('app.name')}] ${t('settings.contactSubject')}`)}`}
          >
            {t('settings.contactUs')}
          </a>
          <button type="button" className="settings-row-button" onClick={goToTermsOfService}>
            {t('profile.viewTermsOfService')}
          </button>
          <button type="button" className="settings-row-button" onClick={goToPrivacyPolicy}>
            {t('profile.viewPrivacyPolicy')}
          </button>
          <button type="button" className="settings-row-button" onClick={() => setShowOnboardingPreview(true)}>
            {t('onboarding.replayButton')}
          </button>
          {onReplayTutorial && (
            <button type="button" className="settings-row-button" onClick={onReplayTutorial}>
              {t('tutorial.replayButton')}
            </button>
          )}
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

      {showOnboardingPreview && (
        <OnboardingScreen onDismiss={() => setShowOnboardingPreview(false)} replay />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          message={t('profile.deleteAccountConfirm')}
          confirmLabel={t('profile.deleteAccount')}
          onConfirm={() => void handleDeleteAccount()}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
