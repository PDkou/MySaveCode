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

/** The narrowest layout width of the wide (sidebar) layouts; the window is magnified from this reference like the single column is from 430. */
export const WIDE_CONTENT_WIDTH = 800;

/** A landscape tablet / unfolded foldable in landscape: room for a sidebar and a content area, clearly wider than tall (a near-square window stays a single, fitted column). */
export const isWideWindow = (w: number = window.innerWidth, h: number = window.innerHeight): boolean =>
  isTabletWindow(w, h) && w >= WIDE_CONTENT_WIDTH && w / h >= 1.15;

/** A landscape phone: too short for the phone layout, wide enough for more columns (no sidebar). */
export const isLandPhoneWindow = (w: number = window.innerWidth, h: number = window.innerHeight): boolean =>
  !isTabletWindow(w, h) && w > h && w >= 640;

export type LayoutKind = 'single' | 'land' | 'wide';
export const layoutKindFor = (w: number, h: number): LayoutKind => (isWideWindow(w, h) ? 'wide' : isLandPhoneWindow(w, h) ? 'land' : 'single');

/** The magnification for a window: 1 on phones; on tablets as large as fits the width of the column(s) and the 844 px screen height, at most 2. */
export function appScaleFor(w: number, h: number): number {
  if (!isTabletWindow(w, h)) return 1;
  const s = Math.min(w / (isWideWindow(w, h) ? WIDE_CONTENT_WIDTH : 430), h / 844, 2);
  return s < 1.05 ? 1 : Math.round(s * 100) / 100;
}
