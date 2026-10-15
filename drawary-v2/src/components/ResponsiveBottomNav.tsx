import { useEffect, useRef, useState } from 'react';
import { BottomNavFinalConfirmed, type BottomNavTab } from './BottomNav_FINAL_CONFIRMED';

const REFERENCE_WIDTH = 390;
const REFERENCE_HEIGHT = 94;

interface ResponsiveBottomNavProps {
  active: BottomNavTab;
  onNavigate: (route: BottomNavTab) => void;
  onCreateDrawer: () => void;
}

/** Keep the approved 390 × 94 artwork & hotspots; scale the entire surface as one unit on narrow viewports. */
export function ResponsiveBottomNav({ active, onNavigate, onCreateDrawer }: ResponsiveBottomNavProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.min(1, entry.contentRect.width / REFERENCE_WIDTH);
      setScale(next);
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="drawary-nav-host" ref={hostRef} style={{ height: REFERENCE_HEIGHT * scale }}>
      <div className="drawary-nav-scale" style={{ transform: `translateX(-50%) scale(${scale})` }}>
        <BottomNavFinalConfirmed
          active={active}
          onHome={() => onNavigate('home')}
          onSearch={() => onNavigate('search')}
          onAdd={onCreateDrawer}
          onStats={() => onNavigate('stats')}
          onSettings={() => onNavigate('settings')}
          assetRoot={`${import.meta.env.BASE_URL}assets/nav`}
        />
      </div>
    </div>
  );
}
