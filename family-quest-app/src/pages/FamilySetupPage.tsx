import { useTranslation } from 'react-i18next';

import { useAuth } from '../context/AuthContext';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { ThemeToggle } from '../components/ThemeToggle';
import { FamilyOnboardingForms } from '../components/FamilyOnboardingForms';

export function FamilySetupPage() {
  const { t } = useTranslation();
  const { signOut } = useAuth();

  return (
    <div className="screen family-setup-screen">
      <div className="topbar">
        <h1 className="app-title">{t('app.name')}</h1>
        <div className="topbar-actions">
          <ThemeToggle />
          <LanguageSwitch />
          <button type="button" className="btn btn-ghost" onClick={() => void signOut()}>
            {t('auth.logout')}
          </button>
        </div>
      </div>

      <div className="family-setup-intro">
        <h2>{t('family.setupTitle')}</h2>
        <p>{t('family.setupSubtitle')}</p>
      </div>

      <FamilyOnboardingForms />
    </div>
  );
}
