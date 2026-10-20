/**
 * App colour theme (#39). The choice is saved as the setting `theme`; the page
 * wears it through `data-color-theme` on <html>. Lavender is the approved
 * default and defines nothing extra (see scripts/make_theme_css.py).
 */
export type ThemeId = 'lavender' | 'coral' | 'sage' | 'mustard' | 'sky';

export const THEME_IDS: readonly ThemeId[] = ['lavender', 'coral', 'sage', 'mustard', 'sky'];
export const THEME_KEY = 'theme';
export const DEFAULT_THEME: ThemeId = 'lavender';

export const isThemeId = (v: unknown): v is ThemeId => typeof v === 'string' && (THEME_IDS as readonly string[]).includes(v);

export const readTheme = (settings: Record<string, unknown>): ThemeId =>
  isThemeId(settings[THEME_KEY]) ? settings[THEME_KEY] : DEFAULT_THEME;

// A copy of the choice outside the database, so the first paint already has the right colours
// (the database loads a moment later and stays the source of truth).
const CACHE_KEY = 'drawary.theme';

function cacheGet(): ThemeId | null {
  try { const v = localStorage.getItem(CACHE_KEY); return isThemeId(v) ? v : null; } catch { return null; }
}
function cacheSet(id: ThemeId): void {
  try { localStorage.setItem(CACHE_KEY, id); } catch { /* private mode etc.: fine without it */ }
}

/** Puts the theme on the page. */
export function applyTheme(id: ThemeId, root: HTMLElement = document.documentElement): void {
  if (id === DEFAULT_THEME) delete root.dataset.colorTheme;
  else root.dataset.colorTheme = id;
  cacheSet(id);
  themeListeners.forEach((l) => l(id));
}

/** Before the first render. */
export function applyCachedTheme(): void {
  const id = cacheGet();
  if (id && id !== DEFAULT_THEME) document.documentElement.dataset.colorTheme = id;
}

const themeListeners = new Set<(id: ThemeId) => void>();
export function onThemeApplied(l: (id: ThemeId) => void): () => void {
  themeListeners.add(l);
  return () => { themeListeners.delete(l); };
}

export const currentTheme = (root: HTMLElement = document.documentElement): ThemeId =>
  isThemeId(root.dataset.colorTheme) ? root.dataset.colorTheme : DEFAULT_THEME;
