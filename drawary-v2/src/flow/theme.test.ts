import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_THEME, isThemeId, readTheme, THEME_IDS } from './theme';
import { themedSrc } from '../theme/themedImages';

describe('theme setting', () => {
  it('defaults to lavender and ignores junk', () => {
    expect(DEFAULT_THEME).toBe('lavender');
    expect(readTheme({})).toBe('lavender');
    expect(readTheme({ theme: 'coral' })).toBe('coral');
    expect(readTheme({ theme: 'neon' })).toBe('lavender');
    expect(readTheme({ theme: 3 })).toBe('lavender');
    expect(THEME_IDS.every(isThemeId)).toBe(true);
  });
});

describe('themed pictures', () => {
  it('points accent artwork at the theme folder and back at the originals', () => {
    expect(themedSrc('/assets/ui-icons/icon_lock.webp', 'coral')).toBe('/assets-theme/coral/ui-icons/icon_lock.webp');
    expect(themedSrc('/assets-theme/coral/ui-icons/icon_lock.webp', 'sky')).toBe('/assets-theme/sky/ui-icons/icon_lock.webp');
    expect(themedSrc('/assets-theme/sky/ui-icons/icon_lock.webp', 'lavender')).toBe('/assets/ui-icons/icon_lock.webp');
    expect(themedSrc('./assets/nav/footer_background_plus_only.webp', 'sage')).toBe('./assets-theme/sage/nav/footer_background_plus_only.webp');
    expect(themedSrc('/assets/field-types/field_text.webp', 'mustard')).toBe('/assets-theme/mustard/field-types/field_text.webp');
  });
  it('leaves artwork that is not themed alone (mascot, brand, drawer icons, photos)', () => {
    for (const s of ['/assets/mascot/x.webp', '/assets/brand/brand_wordmark.webp', '/assets/drawer-icons/drawer_icon_plants.webp', 'blob:http://x/1', 'data:image/png;base64,AA']) {
      expect(themedSrc(s, 'coral')).toBeNull();
    }
  });
});

// ---------------------------------------------------------------- colour guard
const SRC = fileURLToPath(new URL('..', import.meta.url));
const cssFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? cssFiles(p) : p.endsWith('.css') ? [p] : [];
  });
const read = (f: string) => readFileSync(f, 'utf8');

function hue(r: number, g: number, b: number) {
  const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, d = mx - mn, l = (mx + mn) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d > 0) {
    const R = r / 255, G = g / 255, B = b / 255;
    if (mx === R) h = (((G - B) / d) % 6 + 6) % 6; else if (mx === G) h = (B - R) / d + 2; else h = (R - G) / d + 4;
  }
  return { h: h * 60, l, s };
}
const isAccent = (r: number, g: number, b: number) => {
  const { h, l, s } = hue(r, g, b);
  return h >= 235 && h <= 300 && s >= 0.12 && !(s < 0.2 && l < 0.3);
};
const SKIP = ['ThemeSettingsScreen.css', 'BackupProgressScreen.css', 'themes.css'];

describe('theme colours in the CSS', () => {
  const files = cssFiles(SRC).filter((f) => !SKIP.some((s) => f.endsWith(s)));

  it('has no lavender-family colour that a theme could not change', () => {
    const loose: string[] = [];
    for (const f of files) {
      for (const rule of read(f).split('}')) {
        if (rule.split('{')[0].includes('--lavender')) continue; // Stats' category tiles keep their own colours
        const bare = rule.replace(/var\(--t[cr]-[^)]*\)/g, '').replace(/rgba?\(var\([^)]*\)[^)]*\)/g, '');
        for (const m of bare.matchAll(/#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
          let h = m[1].toLowerCase(); if (h.length === 3) h = [...h].map((c) => c + c).join('');
          if (isAccent(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16))) loose.push(`${f.replace(SRC, '')}: #${h}`);
        }
        for (const m of bare.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
          if (isAccent(+m[1], +m[2], +m[3])) loose.push(`${f.replace(SRC, '')}: rgb(${m[1]},${m[2]},${m[3]})`);
        }
      }
    }
    // Fix: wrap it like the others, then run `python3 scripts/theme_codemod.py && python3 scripts/make_theme_css.py`.
    expect(loose).toEqual([]);
  });

  it('src/theme/themes.css defines every wrapped colour for every theme', () => {
    const css = files.map(read).join('\n');
    const themes = read(join(SRC, 'theme/themes.css'));
    const used = [...new Set([...css.matchAll(/--t[cr]-[0-9a-f-]+(?=,)/g)].map((m) => m[0]))];
    expect(used.length).toBeGreaterThan(100);
    for (const theme of ['coral', 'sage', 'mustard', 'sky']) {
      const block = themes.split(`:root[data-color-theme="${theme}"]{`)[1].split('}')[0];
      const missing = used.filter((v) => !block.includes(`${v}:`));
      expect(missing, `${theme} misses ${missing.slice(0, 3)}`).toEqual([]);
    }
  });
});
