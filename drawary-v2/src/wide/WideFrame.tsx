import type { ReactNode } from 'react';
import './wide.css';

/**
 * The shell of the landscape layouts: an optional sidebar and the content on top, the approved bottom nav underneath (artwork
 * 390 wide, centered, on the same white band as on a phone). 'land' = landscape phone (no sidebar), 'wide' = landscape tablet /
 * unfolded foldable. The window's height is the frame's height, so each part scrolls on its own and the nav is always reachable.
 */
export function WideFrame({ kind, route, sidebar, nav, children }: { kind: 'land' | 'wide'; route: string; sidebar?: ReactNode; nav: ReactNode; children: ReactNode }) {
  return (
    <main className={`drawary-app-shell wide-app wide-app--${kind}`} data-route={route} data-layout={kind}>
      <div className="wide-body">
        {sidebar}
        <div className="wide-main">{children}</div>
      </div>
      <footer className="drawary-shell-footer wide-nav">{nav}</footer>
    </main>
  );
}
