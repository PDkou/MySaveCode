import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAuth, AuthActionError } from '../context/AuthContext';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { ThemeToggle } from '../components/ThemeToggle';
import { ColorThemePicker } from '../components/ColorThemePicker';

type Tab = 'login' | 'signup';

export function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

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
        <ThemeToggle />
        <ColorThemePicker />
        <LanguageSwitch />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/help')}>
          {t('help.openButton')}
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
    </div>
  );
}
