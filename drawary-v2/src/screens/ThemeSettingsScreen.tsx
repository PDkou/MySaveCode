import { useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import './ThemeSettingsScreen.css';

export type ThemeId = 'lavender' | 'coral' | 'sage' | 'mustard' | 'sky';

export interface ThemeSettingsScreenProps {
  initialTheme?: ThemeId;
  onBack?: () => void;
  onThemeChange?: (theme: ThemeId) => void;
}

const THEMES: { id: ThemeId; label: string; flower: string; alt: string }[] = [
  { id: 'lavender', label: '라벤더', flower: 'theme_flower_lavender.webp', alt: '보라색 둥근 꽃' },
  { id: 'coral', label: '코랄', flower: 'theme_flower_coral.webp', alt: '코랄색 튤립 꽃' },
  { id: 'sage', label: '세이지', flower: 'theme_flower_sage.webp', alt: '연녹색 꽃과 잎' },
  { id: 'mustard', label: '머스타드', flower: 'theme_flower_mustard.webp', alt: '노란색 데이지 꽃' },
  { id: 'sky', label: '스카이', flower: 'theme_flower_sky.webp', alt: '하늘색 종 모양 꽃' },
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
      <ScreenHeader title="테마" onBack={onBack} backLabel="설정으로 돌아가기" height={88} />
      <section className="ts39-panel" aria-label="테마 설정">
        <h2 className="ts39-section-heading">테마 스타일</h2>
        <div className="ts39-themes" aria-label="테마 선택">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="ts39-theme"
              data-theme={t.id}
              aria-pressed={t.id === theme}
              onClick={() => select(t.id)}
            >
              <span className="ts39-theme-preview">
                <img className="ts39-theme-flower" src={`/assets/theme/${t.flower}`} alt={t.alt} />
                <span className="ts39-accent-bar" />
                <span className="ts39-preview-field" />
              </span>
              <span className="ts39-theme-name">{t.label}</span>
            </button>
          ))}
        </div>
        <p className="ts39-theme-note">선택한 테마는 앱 전체의 주요 색상과 장식에 적용됩니다.</p>
      </section>
    </main>
  );
}
