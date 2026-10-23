import { useCallback, type UIEvent } from 'react';

const positions = new Map<string, number>();

/**
 * Remembers how far a list was scrolled, so coming back to it (from an item, a photo, a sheet) lands where the person was instead of
 * at the top. Spread the result onto the scrolling element; `key` names the list (one per drawer, for example).
 */
export function useScrollMemory(key: string): { ref: (el: HTMLElement | null) => void; onScroll: (e: UIEvent<HTMLElement>) => void } {
  const ref = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const saved = positions.get(key) ?? 0;
    if (!saved) return;
    el.scrollTop = saved;
    // The rows may not have their height yet on this very frame.
    if (el.scrollTop < saved) requestAnimationFrame(() => { el.scrollTop = saved; });
  }, [key]);
  const onScroll = useCallback((e: UIEvent<HTMLElement>) => { positions.set(key, e.currentTarget.scrollTop); }, [key]);
  return { ref, onScroll };
}
