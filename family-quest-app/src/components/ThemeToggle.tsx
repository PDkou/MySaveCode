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
    <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={toggle} aria-label={t('theme.toggle')}>
      {theme === 'light' ? (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      )}
    </button>
  );
}
