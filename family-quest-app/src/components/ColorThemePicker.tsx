import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  applyColorTheme,
  COLOR_THEME_KEYS,
  COLOR_THEME_STORAGE_KEY,
  COLOR_THEME_SWATCH,
  getInitialColorTheme,
} from '../lib/colorTheme';
import type { ColorTheme } from '../lib/colorTheme';
import { ModalHeader } from './ModalHeader';
import { useBackDismiss } from '../lib/backNav';

export function ColorThemePicker() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<ColorTheme>(getInitialColorTheme);
  const [open, setOpen] = useState(false);
  useBackDismiss(open, () => setOpen(false));

  useEffect(() => {
    applyColorTheme(theme);
  }, [theme]);

  const choose = (next: ColorTheme) => {
    setTheme(next);
    try {
      window.localStorage.setItem(COLOR_THEME_STORAGE_KEY, next);
    } catch {
      // Falls back to in-memory only for this session.
    }
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-icon btn-sm"
        onClick={() => setOpen(true)}
        aria-label={t('colorTheme.label')}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="17.5" cy="10.5" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="8.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="6.5" cy="12.5" r="1.5" fill="currentColor" stroke="none" />
          <path d="M12 21a9 9 0 1 1 0-18c4.97 0 9 3.5 9 7.5 0 2-1.5 3.5-3.5 3.5h-2a2 2 0 0 0-2 2c0 .5.2 1 .5 1.4.3.4.5.9.5 1.4 0 1-.8 2.2-2.5 2.2z" />
        </svg>
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <ModalHeader title={t('colorTheme.heading')} onClose={() => setOpen(false)} />
            <div className="color-theme-grid">
              {COLOR_THEME_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`color-theme-option ${theme === key ? 'color-theme-option-active' : ''}`}
                  onClick={() => choose(key)}
                  aria-pressed={theme === key}
                >
                  <span className="color-theme-swatch" style={{ backgroundColor: COLOR_THEME_SWATCH[key] }} />
                  <span className="color-theme-label">{t(`colorTheme.${key}`)}</span>
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-primary btn-block" onClick={() => setOpen(false)}>
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
