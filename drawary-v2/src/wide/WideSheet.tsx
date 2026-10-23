import type { ReactNode } from 'react';

/**
 * A screen that belongs to a flow (creating a drawer, filling it, editing an item, the notification and repeat steps, ...) opens as a
 * sheet in the middle of the wide window, over the screen it came from (dimmed, not clickable). The frame around it (drawer list,
 * the full-width nav band) stays exactly as on every other wide screen. `width` is the sheet's width in px.
 */
export function WideSheet({ width = 560, children }: { width?: number; children: ReactNode }) {
  return (
    <div className="wide-sheet-layer">
      <div className="wide-sheet-scrim" aria-hidden="true" />
      <section className="wide-sheet" role="dialog" aria-modal="true" style={{ width }}>
        {children}
      </section>
    </div>
  );
}
