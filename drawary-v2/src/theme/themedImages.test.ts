import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { themedSrc } from './themedImages';

describe('themedSrc', () => {
  it('points a themed picture at its copy for the theme, and back at the original for lavender', () => {
    expect(themedSrc('/assets/ui-icons/icon_grid.webp', 'coral')).toBe('/assets-theme/coral/ui-icons/icon_grid.webp');
    expect(themedSrc('/assets-theme/coral/ui-icons/icon_grid.webp', 'lavender')).toBe('/assets/ui-icons/icon_grid.webp');
  });

  it('leaves pictures that are never themed alone', () => {
    expect(themedSrc('/assets/drawer-icons/drawer_icon_gifts.webp', 'coral')).toBeNull();
    expect(themedSrc('/assets/brand/app_icon.webp', 'coral')).toBeNull();
  });

  it('does not rewrite a path that climbs out of the folder (it would point at a copy that does not exist)', () => {
    expect(themedSrc('/assets/ui-icons/../drawer-icons/drawer_icon_gifts.webp', 'coral')).toBeNull();
  });
});

describe('every themed picture has its copy for every theme', () => {
  const root = fileURLToPath(new URL('../../public', import.meta.url));
  const dirs = ['ui-icons', 'field-types', 'nav', 'brand', 'global-search-approved'];
  const themes = ['coral', 'sage', 'mustard', 'sky'] as const;

  it('exists on disk (a missing copy shows as a broken picture in that theme)', () => {
    const missing: string[] = [];
    for (const dir of dirs) {
      for (const file of readdirSync(`${root}/assets/${dir}`)) {
        for (const theme of themes) {
          const src = themedSrc(`/assets/${dir}/${file}`, theme);
          if (src && !existsSync(`${root}${src}`)) missing.push(src);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
