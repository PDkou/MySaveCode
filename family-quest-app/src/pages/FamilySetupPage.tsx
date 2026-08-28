import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../context/AuthContext';
import { SettingsModal } from '../components/SettingsModal';
import { FamilyOnboardingForms } from '../components/FamilyOnboardingForms';
import { OnboardingScreen } from '../components/OnboardingScreen';
import { consumeSettingsReopenFlag } from '../lib/backNav';
import { hasSeenOnboarding, markOnboardingSeen } from '../lib/onboarding';

export function FamilySetupPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  // See backNav.ts's consumeSettingsReopenFlag comment -- restores Settings
  // after navigating away from it to /help, /privacy, or /terms and then
  // pressing back, which otherwise remounts this page fresh with Settings
  // closed.
  const [showSettings, setShowSettings] = useState(() => consumeSettingsReopenFlag());
  // FamilySetupPage is also where returning users land if they ever leave
  // every family (not just fresh signups) -- gating on a per-user "seen"
  // flag rather than "no family yet" keeps this a true one-time welcome
  // screen instead of replaying on every re-entry to this page.
  const [showOnboarding, setShowOnboarding] = useState(() => !!user && !hasSeenOnboarding(user.id));

  const dismissOnboarding = () => {
    if (user) markOnboardingSeen(user.id);
    setShowOnboarding(false);
  };

  return (
    <div className="screen family-setup-screen">
      <div className="topbar">
        <h1 className="app-title">{t('app.name')}</h1>
        <div className="topbar-actions">
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
      </div>

      <div className="family-setup-intro">
        <h2>{t('family.setupTitle')}</h2>
        <p>{t('family.setupSubtitle')}</p>
      </div>

      <FamilyOnboardingForms />

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showOnboarding && <OnboardingScreen onDismiss={dismissOnboarding} />}
    </div>
  );
}
