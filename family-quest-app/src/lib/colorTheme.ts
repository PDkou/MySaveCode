export type ColorTheme = 'purple' | 'pink' | 'blue' | 'green' | 'orange';

export const COLOR_THEME_STORAGE_KEY = 'familyquest.color-theme';

export const COLOR_THEME_KEYS: ColorTheme[] = ['purple', 'pink', 'blue', 'green', 'orange'];

// Swatch colors shown in the picker UI -- kept in sync by hand with the
// light-mode CSS variables in global.css's [data-color-theme] blocks.
export const COLOR_THEME_SWATCH: Record<ColorTheme, string> = {
  purple: '#6f5bd3',
  pink: '#d1487a',
  blue: '#3b7dd8',
  green: '#6b8e4e',
  orange: '#d9662f',
};

function isColorTheme(value: string | null): value is ColorTheme {
  return !!value && (COLOR_THEME_KEYS as string[]).includes(value);
}

export function getInitialColorTheme(): ColorTheme {
  try {
    const stored = window.localStorage.getItem(COLOR_THEME_STORAGE_KEY);
    if (isColorTheme(stored)) return stored;
  } catch {
    // localStorage can be unavailable (private mode / storage quota) --
    // fall through to the default for this session.
  }
  return 'purple';
}

export function applyColorTheme(theme: ColorTheme) {
  document.documentElement.dataset.colorTheme = theme;
}
