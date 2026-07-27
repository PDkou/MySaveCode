import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAuth, AuthActionError } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { updatePassword } = useAuth();

  const [ready, setReady] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase's client already parses the recovery token out of the URL
    // hash on load (detectSessionInUrl: true) and turns it into a real
    // session -- this just waits for that to land before deciding whether
    // to show the form or the invalid-link message.
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setHasRecoverySession(!!data.session);
      setReady(true);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasRecoverySession(true);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorKey(null);
    setSubmitting(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (err) {
      setErrorKey(err instanceof AuthActionError ? err.translationKey : 'auth.error.unknown');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="screen auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <img src="/icons/icon-192.png" alt="" className="brand-mark" />
          <h1>{t('auth.resetPasswordHeading')}</h1>
        </div>

        {!ready ? null : done ? (
          <>
            <p className="form-info" role="status">{t('auth.resetPasswordSuccess')}</p>
            <button type="button" className="btn btn-primary btn-block" onClick={() => navigate('/', { replace: true })}>
              {t('auth.resetPasswordContinue')}
            </button>
          </>
        ) : !hasRecoverySession ? (
          <p className="form-error" role="alert">{t('auth.error.invalidResetLink')}</p>
        ) : (
          <form onSubmit={handleSubmit} className="form">
            <label className="field">
              <span>{t('auth.newPassword')}</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.newPasswordPlaceholder')}
                autoComplete="new-password"
                minLength={6}
                autoFocus
              />
            </label>
            {errorKey && <p className="form-error" role="alert">{t(errorKey)}</p>}
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? t('auth.resettingPassword') : t('auth.resetPasswordButton')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
