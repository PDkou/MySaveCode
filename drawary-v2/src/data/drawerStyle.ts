/**
 * How a stored drawer (iconKey / colorKey) maps to approved visuals.
 * `card` colors are sampled from the approved #3 home render; `swatch`
 * colors are the six picker dots from #8. `blue` has no card in any
 * approved home render, so its card tint is derived (swatch lightened the
 * same way the other five swatches relate to their cards).
 */
export interface DrawerColor { key: string; swatch: string; card: string }

export const DRAWER_COLORS: readonly DrawerColor[] = [
  { key: 'pink', swatch: '#fadddd', card: '#fbe1e3' },
  { key: 'lavender', swatch: '#e7e0f7', card: '#eae5f9' },
  { key: 'green', swatch: '#dfeeda', card: '#e2f0da' },
  { key: 'peach', swatch: '#f8e8d4', card: '#fbe9d9' },
  { key: 'yellow', swatch: '#f7e8b9', card: '#fff0cb' },
  { key: 'blue', swatch: '#ddebfb', card: '#e1edfa' },
];

export const drawerCardColor = (colorKey: string): string =>
  (DRAWER_COLORS.find((c) => c.key === colorKey) ?? DRAWER_COLORS[0]).card;

export const drawerIconUrl = (iconKey: string): string => `/assets/drawer-icons/drawer_icon_${iconKey}.webp`;
// Opaque-pixel bounds of each approved drawer icon (width, height, x0, y0, x1, y1),
// generated from public/assets/drawer-icons. The approved home render fits every
// icon's visible glyph into the same ~56px box, so cards size icons from these.
export const DRAWER_ICON_BOUNDS: Record<string, readonly [number, number, number, number, number, number]> = {
  baby: [76, 76, 8, 11, 68, 65],
  books: [67, 67, 7, 10, 60, 56],
  cafe: [64, 64, 7, 10, 57, 53],
  camera: [68, 68, 7, 12, 61, 56],
  car: [71, 71, 7, 12, 64, 59],
  clothes: [67, 67, 7, 9, 60, 57],
  cosmetics: [77, 77, 24, 8, 53, 69],
  documents: [66, 66, 11, 7, 55, 59],
  electronics: [76, 76, 8, 16, 68, 59],
  finance: [65, 65, 7, 8, 58, 57],
  fitness: [71, 71, 7, 18, 64, 53],
  food: [64, 64, 11, 7, 52, 57],
  games: [75, 75, 8, 16, 67, 58],
  gifts: [65, 65, 9, 7, 56, 58],
  health: [59, 59, 6, 6, 53, 52],
  hobby: [69, 69, 7, 8, 62, 61],
  home: [67, 67, 7, 7, 60, 60],
  misc: [68, 68, 13, 30, 51, 39],
  movies: [66, 66, 9, 7, 57, 59],
  music: [61, 61, 8, 6, 52, 55],
  pets: [61, 61, 6, 8, 55, 52],
  plants: [68, 68, 7, 7, 61, 60],
  shopping: [66, 66, 10, 7, 55, 59],
  travel: [60, 60, 6, 8, 54, 52],
};
const ICON_FIT = 56.5; // px, longest side of the visible glyph on a 165x158 home card
const ICON_CENTER = { x: 82.5, y: 46 };

/** Absolute-position style placing a drawer icon the way the approved home card does. */
export function drawerIconPlacement(iconKey: string): { left: number; top: number; width: number; height: number } {
  const b = DRAWER_ICON_BOUNDS[iconKey] ?? DRAWER_ICON_BOUNDS.misc;
  const [w, h, x0, y0, x1, y1] = b;
  const s = ICON_FIT / Math.max(x1 - x0, y1 - y0);
  return {
    left: ICON_CENTER.x - ((x0 + x1) / 2) * s,
    top: ICON_CENTER.y - ((y0 + y1) / 2) * s,
    width: w * s,
    height: h * s,
  };
}
