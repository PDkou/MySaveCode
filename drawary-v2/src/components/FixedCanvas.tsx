import { useEffect, useRef, useState, type ReactNode } from 'react';
import './FixedCanvas.css';

const REFERENCE_WIDTH = 390;

/** Several confirmed screens (so far: #03/#04 home) are shipped as a fixed
 * 390px-wide image with absolute-positioned hotspots, the same shape as the
 * approved V4 bottom nav. ResponsiveBottomNav already scales that nav as
 * one unit on narrow viewports instead of letting it overflow/clip; this
 * is the same technique generalized to any fixed-width screen body so a
 * 320px-wide device shows the whole confirmed layout, scaled down, rather
 * than cropping the right/bottom edge. Width < 390 scales down; width >=
 * 390 renders at the approved 1:1 size. */
export function FixedCanvas({ height, children }: { height: number; children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(1, entry.contentRect.width / REFERENCE_WIDTH));
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="drawary-fixed-canvas-host" ref={hostRef} style={{ height: height * scale }}>
      <div className="drawary-fixed-canvas-scale" style={{ height, transform: `translateX(-50%) scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
