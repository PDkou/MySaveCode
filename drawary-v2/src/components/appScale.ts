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

/** The magnification for a window: 1 on phones; on tablets as large as fits the width of the 430 px column and the 844 px screen height, at most 2. */
export function appScaleFor(w: number, h: number): number {
  if (!isTabletWindow(w, h)) return 1;
  const s = Math.min(w / 430, h / 844, 2);
  return s < 1.05 ? 1 : Math.round(s * 100) / 100;
}
