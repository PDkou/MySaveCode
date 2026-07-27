import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth, AuthActionError } from '../context/AuthContext';
import { SettingsModal } from '../components/SettingsModal';

type Tab = 'login' | 'signup';

export function AuthPage() {
  const { t } = useTranslation();
  const { signIn, signUp } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const switchTab = (nextTab: Tab) => {
    setTab(nextTab);
    setErrorKey(null);
    setInfoMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorKey(null);
    setInfoMessage(null);

    if (!email.trim()) {
      setErrorKey('auth.error.emailRequired');
      return;
    }
    if (!password) {
      setErrorKey('auth.error.passwordRequired');
      return;
    }
    if (tab === 'signup' && !displayName.trim()) {
      setErrorKey('auth.error.displayNameRequired');
      return;
    }

    setSubmitting(true);
    try {
      if (tab === 'login') {
        await signIn(email, password);
      } else {
        const { needsEmailConfirmation } = await signUp(email, password, displayName);
        if (needsEmailConfirmation) {
          setInfoMessage(t('auth.signupSuccessConfirmEmail'));
          setTab('login');
        } else {
          setInfoMessage(t('auth.signupSuccessAutoLogin'));
        }
      }
    } catch (err) {
      const key = err instanceof AuthActionError ? err.translationKey : 'auth.error.unknown';
      setErrorKey(key);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="screen auth-screen">
      <div className="auth-topbar">
        <button
          type="button"
          className="btn btn-ghost btn-icon btn-sm"
          onClick={() => setShowSettings(true)}
          aria-label={t('settings.heading')}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      <div className="auth-card">
        <div className="auth-brand">
          <img src="/icons/icon-192.png" alt="" className="brand-mark" />
          <h1>{t('app.name')}</h1>
          <p>{t('app.tagline')}</p>
        </div>

        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'login'}
            className={`tab ${tab === 'login' ? 'tab-active' : ''}`}
            onClick={() => switchTab('login')}
          >
            {t('auth.loginTab')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'signup'}
            className={`tab ${tab === 'signup' ? 'tab-active' : ''}`}
            onClick={() => switchTab('signup')}
          >
            {t('auth.signupTab')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form" noValidate>
          {tab === 'signup' && (
            <label className="field">
              <span>{t('auth.displayName')}</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('auth.displayNamePlaceholder')}
                maxLength={40}
                autoComplete="nickname"
              />
            </label>
          )}

          <label className="field">
            <span>{t('auth.email')}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              autoComplete="email"
              inputMode="email"
            />
          </label>

          <label className="field">
            <span>{t('auth.password')}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
            />
          </label>

          {errorKey && <p className="form-error" role="alert">{t(errorKey)}</p>}
          {infoMessage && <p className="form-info" role="status">{infoMessage}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting
              ? tab === 'login'
                ? t('auth.loggingIn')
                : t('auth.signingUp')
              : tab === 'login'
                ? t('auth.login')
                : t('auth.signup')}
          </button>
        </form>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
