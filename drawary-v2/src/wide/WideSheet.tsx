import { useEffect, useRef, type ReactNode } from 'react';
import { t } from '../i18n';

/**
 * A screen that belongs to a flow (creating a drawer, filling it, editing an item, the notification and repeat steps, ...) opens as a
 * sheet in the middle of the wide window, over the screen it came from (dimmed). The frame around it (drawer list, the full-width
 * nav band) stays exactly as on every other wide screen. `width` is the sheet's width in px.
 *
 * Tapping the dimmed area closes the sheet (`onDismiss`), so it never takes a button press to get out. When something was typed or
 * changed in it (`dirty`, or any input inside), a tap outside asks first, so a slip of the finger does not throw the work away.
 * `routeKey` tells that the sheet now shows another step, which starts clean.
 */
export function WideSheet({ width = 560, onDismiss, dirty = false, routeKey, children }: { width?: number; onDismiss?: () => void; dirty?: boolean; routeKey?: string; children: ReactNode }) {
  const typed = useRef(false);
  useEffect(() => { typed.current = false; }, [routeKey]);
  const dismiss = () => {
    if (!onDismiss) return;
    if ((typed.current || dirty) && !window.confirm(t('입력한 내용이 사라져요. 닫을까요?'))) return;
    onDismiss();
  };
  return (
    <div className="wide-sheet-layer">
      <div className="wide-sheet-scrim" aria-hidden="true" onClick={dismiss} />
      <section className="wide-sheet" role="dialog" aria-modal="true" style={{ width }} onInput={() => { typed.current = true; }}>
        {children}
      </section>
    </div>
  );
}
