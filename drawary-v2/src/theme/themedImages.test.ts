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
