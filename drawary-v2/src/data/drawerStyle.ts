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
// generated from public/assets/drawer-icons (re-generate if the icon files change). The approved home render fits every
// icon's visible glyph into the same ~56px box, so cards size icons from these.
export const DRAWER_ICON_BOUNDS: Record<string, readonly [number, number, number, number, number, number]> = {
  baby: [244, 244, 22, 39, 222, 206],
  books: [236, 236, 22, 37, 213, 195],
  cafe: [224, 224, 16, 42, 209, 179],
  camera: [248, 248, 25, 44, 222, 204],
  car: [235, 235, 22, 41, 213, 195],
  clothes: [241, 241, 20, 37, 221, 201],
  cosmetics: [271, 271, 83, 31, 188, 239],
  documents: [215, 215, 34, 25, 181, 190],
  electronics: [257, 257, 28, 53, 228, 200],
  finance: [223, 223, 21, 30, 202, 193],
  fitness: [246, 246, 22, 63, 223, 182],
  food: [223, 223, 34, 30, 186, 194],
  games: [263, 263, 27, 57, 235, 203],
  gifts: [235, 235, 31, 26, 203, 208],
  health: [209, 209, 22, 20, 186, 185],
  hobby: [228, 228, 21, 28, 206, 200],
  home: [231, 231, 23, 25, 208, 206],
  misc: [331, 331, 70, 144, 242, 191],
  movies: [238, 238, 32, 25, 205, 212],
  music: [207, 207, 27, 21, 177, 187],
  pets: [221, 221, 22, 29, 200, 188],
  plants: [230, 230, 20, 27, 211, 199],
  shopping: [234, 234, 35, 25, 195, 209],
  travel: [225, 225, 21, 31, 204, 193],
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
