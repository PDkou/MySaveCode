import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth, AuthActionError } from '../context/AuthContext';

// Shown by RootGate (family-quest-app only, see APP_MODE there) instead of
// the normal dashboard whenever profile.birthday is still null -- this
// covers every account created before signup started collecting it
// (AuthPage.tsx), so the whole user base converges on having a real
// birthday without a one-off backfill migration. Once ad personalization
// actually reads this (MONETIZATION_DESIGN.md section 1), it's what lets a
// minor's ad requests be tagged non-personalized under Google Play's
// Families Policy rather than applying that restriction to every account.
// Nothing else in the app is reachable from here -- same "no back button"
// shape as AccountDeletionPendingScreen, since submitting is the only way
// forward.
export function BirthdayRequiredScreen() {
  const { t } = useTranslation();
  const { signOut, updateBirthday } = useAuth();
  const [birthday, setBirthday] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorKey(null);
    if (!birthday) {
      setErrorKey('auth.error.birthdayRequired');
      return;
    }
    if (birthday > new Date().toISOString().slice(0, 10)) {
      setErrorKey('auth.error.birthdayFuture');
      return;
    }
    setBusy(true);
    try {
      await updateBirthday(birthday);
      // No further navigation needed -- updateBirthday updates profile in
      // AuthContext state, so RootGate re-renders past this screen on its own.
    } catch (err) {
      setErrorKey(err instanceof AuthActionError ? err.translationKey : 'auth.error.unknown');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen account-deletion-screen birthday-required-screen">
      <div className="account-deletion-card birthday-required-card">
        <span className="account-deletion-icon" aria-hidden="true">🎂</span>
        <h1>{t('account.birthdayRequired.heading')}</h1>
        <p className="account-deletion-body">{t('account.birthdayRequired.body')}</p>
        <label className="field">
          <span>{t('auth.birthday')}</span>
          <input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            autoComplete="bday"
            autoFocus
          />
        </label>
        {errorKey && <p className="form-error" role="alert">{t(errorKey)}</p>}
        <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={() => void handleSubmit()}>
          {busy ? t('common.saving') : t('account.birthdayRequired.submitButton')}
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={() => void signOut()}>
          {t('auth.logout')}
        </button>
      </div>
    </div>
  );
}
