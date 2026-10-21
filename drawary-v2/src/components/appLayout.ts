import { useSyncExternalStore } from 'react';
import { layoutKindFor, type LayoutKind } from './appScale';

/** Which layout the window gets: 'single' (phone column), 'land' (landscape phone) or 'wide' (landscape tablet / unfolded foldable).
 * AppScaler owns the window size (it ignores the shorter window while the keyboard is open), so it reports here and the app
 * reads it; starting from the real window avoids a one-frame flash of the wrong layout. */
let kind: LayoutKind = typeof window !== 'undefined' ? layoutKindFor(window.innerWidth, window.innerHeight) : 'single';
const listeners = new Set<() => void>();
export const setAppLayout = (next: LayoutKind): void => {
  if (next === kind) return;
  kind = next;
  listeners.forEach((l) => l());
};
export const useAppLayout = (): LayoutKind =>
  useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => kind);
