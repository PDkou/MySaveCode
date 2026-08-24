import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth, AuthActionError } from '../context/AuthContext';

const GRACE_PERIOD_DAYS = 7;

// Shown by RootGate instead of the normal dashboard whenever
// profile.deletion_requested_at is set (schema.sql section 43) -- the
// whole point of the 7-day grace period is that it's cancellable, so this
// screen is reached on every login during that window rather than signing
// the account out immediately on request. Nothing else in the app is
// reachable from here (no back button) -- the account really is scheduled
// for anonymization, so there's nothing else meaningful to show.
export function AccountDeletionPendingScreen() {
  const { t } = useTranslation();
  const { profile, signOut, cancelAccountDeletion } = useAuth();
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const requestedAt = profile?.deletion_requested_at ? new Date(profile.deletion_requested_at) : null;
  const deletesAt = requestedAt ? new Date(requestedAt.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000) : null;
  // Rounds up so "requested a few hours ago" still reads as the full 7
  // days rather than 6 -- the exact cutoff is deletesAt itself either way.
  const daysLeft = deletesAt
    ? Math.max(0, Math.ceil((deletesAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : GRACE_PERIOD_DAYS;

  const handleCancel = async () => {
    setBusy(true);
    setErrorKey(null);
    try {
      await cancelAccountDeletion();
    } catch (err) {
      setErrorKey(err instanceof AuthActionError ? err.translationKey : 'auth.error.unknown');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen account-deletion-screen">
      <div className="account-deletion-card">
        <span className="account-deletion-icon" aria-hidden="true">⏳</span>
        <h1>{t('account.deletionPending.heading')}</h1>
        <p className="account-deletion-body">
          {t('account.deletionPending.body', {
            days: daysLeft,
            date: deletesAt ? deletesAt.toLocaleDateString() : '',
          })}
        </p>
        {errorKey && <p className="form-error" role="alert">{t(errorKey)}</p>}
        <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={() => void handleCancel()}>
          {busy ? t('common.saving') : t('account.deletionPending.cancelButton')}
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={() => void signOut()}>
          {t('auth.logout')}
        </button>
      </div>
    </div>
  );
}
