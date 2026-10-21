import { useSyncExternalStore } from 'react';
import { isWideWindow } from './appScale';

/** Whether the app is drawn as two columns. AppScaler owns the window size (it ignores the shorter window while the keyboard is
 * open), so it reports here and the app reads it; starting from the real window avoids a one-frame flash of the single column. */
let wide = typeof window !== 'undefined' && isWideWindow();
const listeners = new Set<() => void>();
export const setAppWide = (next: boolean): void => {
  if (next === wide) return;
  wide = next;
  listeners.forEach((l) => l());
};
export const useAppWide = (): boolean =>
  useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => wide);
