import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import type { AppLanguageCode } from '../types/database';

export function LanguageSwitch() {
  const { t, i18n } = useTranslation();
  const { setLanguage } = useAuth();
  const current: AppLanguageCode = i18n.language.startsWith('ja') ? 'ja' : 'ko';

  const handleToggle = () => {
    const next: AppLanguageCode = current === 'ko' ? 'ja' : 'ko';
    void setLanguage(next);
  };

  return (
    <button
      type="button"
      className="lang-switch"
      onClick={handleToggle}
      aria-label={t('language.label')}
    >
      {current === 'ko' ? t('language.ja') : t('language.ko')}
    </button>
  );
}
