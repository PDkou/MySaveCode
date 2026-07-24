import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { applyTheme, getInitialTheme, THEME_STORAGE_KEY } from '../lib/theme';
import type { Theme } from '../lib/theme';

export function ThemeToggle() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Falls back to in-memory only for this session.
    }
  };

  return (
    <button type="button" className="lang-switch" onClick={toggle} aria-label={t('theme.toggle')}>
      {theme === 'light' ? t('theme.dark') : t('theme.light')}
    </button>
  );
}
