/**
 * Tablets and foldables' big screens: the whole app is drawn as the same phone-sized layout and magnified as one piece
 * (see AppScaler), so nothing in an approved screen changes proportions. Code that measures pointer movement or the
 * window in on-screen pixels divides by this to get back to the layout's own pixels.
 */
let current = 1;
export const getAppScale = (): number => current;
export const setAppScale = (s: number): void => { current = s; };

/** Android's own tablet breakpoint: the shorter side is at least 600 dp. */
export const isTabletWindow = (w: number = window.innerWidth, h: number = window.innerHeight): boolean => Math.min(w, h) >= 600;

/** Two phone-width columns side by side, with the divider between them. */
export const PANE_WIDTH = 430;
export const PANE_GAP = 24;
export const WIDE_CONTENT_WIDTH = PANE_WIDTH * 2 + PANE_GAP;

/** A landscape tablet / unfolded foldable: wide enough for two columns and clearly wider than tall (a near-square window stays a single, fitted column). */
export const isWideWindow = (w: number = window.innerWidth, h: number = window.innerHeight): boolean =>
  isTabletWindow(w, h) && w >= WIDE_CONTENT_WIDTH && w / h >= 1.2;

/** The magnification for a window: 1 on phones; on tablets as large as fits the width of the column(s) and the 844 px screen height, at most 2. */
export function appScaleFor(w: number, h: number): number {
  if (!isTabletWindow(w, h)) return 1;
  const s = Math.min(w / (isWideWindow(w, h) ? WIDE_CONTENT_WIDTH : PANE_WIDTH), h / 844, 2);
  return s < 1.05 ? 1 : Math.round(s * 100) / 100;
}
