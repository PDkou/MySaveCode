import { useState } from 'react';
import './ThemeSettingsScreen.css';

import type { ThemeId } from '../flow/theme';
import { t, K } from '../i18n';
export type { ThemeId };

export interface ThemeSettingsScreenProps {
  initialTheme?: ThemeId;
  onBack?: () => void;
  onThemeChange?: (theme: ThemeId) => void;
}

const THEMES: { id: ThemeId; label: string; flower: string; alt: string }[] = [
  { id: 'lavender', label: K('라벤더'), flower: 'theme_flower_lavender.webp', alt: K('보라색 둥근 꽃') },
  { id: 'coral', label: K('코랄'), flower: 'theme_flower_coral.webp', alt: K('코랄색 튤립 꽃') },
  { id: 'sage', label: K('세이지'), flower: 'theme_flower_sage.webp', alt: K('연녹색 꽃과 잎') },
  { id: 'mustard', label: K('머스타드'), flower: 'theme_flower_mustard.webp', alt: K('노란색 데이지 꽃') },
  { id: 'sky', label: K('스카이'), flower: 'theme_flower_sky.webp', alt: K('하늘색 종 모양 꽃') },
];

/**
 * #39 테마 설정. Ported from `Drawary_39_CONFIRMED_2026-10-13`'s
 * `index.html` (a self-contained static HTML/CSS/JS confirmed source,
 * no React/TSX given) into real React state -- the vanilla JS's own
 * click handler (toggle `aria-pressed` across buttons) ported 1:1 as
 * `useState`. README.md's own confirmed rule: 5 themes, no accent
 * color swatch, 라벤더 default, 2x2+center-card layout, 5 distinct
 * flower WebPs -- all matched exactly. The 5 `theme_flower_*.webp`
 * assets didn't exist in this app's `public/assets/` yet; copied from
 * the archive into a new `assets/theme/` directory (verified by
 * opening each one directly, not guessed from filenames).
 */
export function ThemeSettingsScreen({ initialTheme = 'lavender', onBack, onThemeChange }: ThemeSettingsScreenProps) {
  const [theme, setTheme] = useState<ThemeId>(initialTheme);

  const select = (id: ThemeId) => {
    setTheme(id);
    onThemeChange?.(id);
  };

  return (
    <main className="ts39-screen">
      <header className="ts39-header">
        {onBack && <button type="button" className="ts39-back" onClick={onBack} aria-label={t('설정으로 돌아가기')} />}
        <h1 className="ts39-title">{t('테마')}</h1>
      </header>
      <section className="ts39-panel" aria-label={t('테마 설정')}>
        <h2 className="ts39-section-heading">{t('테마 스타일')}</h2>
        <div className="ts39-themes" aria-label={t('테마 선택')}>
          {THEMES.map((th) => (
            <button
              key={th.id}
              type="button"
              className="ts39-theme"
              data-theme={th.id}
              aria-pressed={th.id === theme}
              onClick={() => select(th.id)}
            >
              <span className="ts39-theme-preview">
                <img className="ts39-theme-flower" src={`/assets/theme/${th.flower}`} alt={t(th.alt)} />
                <span className="ts39-accent-bar" />
                <span className="ts39-preview-field" />
              </span>
              <span className="ts39-theme-name">{t(th.label)}</span>
            </button>
          ))}
        </div>
        <p className="ts39-theme-note">{t('선택한 테마는 앱 전체의 주요 색상과 장식에 적용됩니다.')}</p>
      </section>
    </main>
  );
}
