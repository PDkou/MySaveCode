import { useEffect, useRef, useState, type ReactNode } from 'react';
import './FixedCanvas.css';
import { getAppScale, isTabletWindow } from './appScale';

const REFERENCE_WIDTH = 390;
/** Canvases at least this tall are whole screens (the 844 px ones); shorter ones are parts of a tab screen that scrolls. */
const FULL_SCREEN_MIN_HEIGHT = 800;
const MIN_SCALE = 0.6;

/** Several confirmed screens (so far: #03/#04 home) are shipped as a fixed
 * 390px-wide image with absolute-positioned hotspots, the same shape as the
 * approved V4 bottom nav. ResponsiveBottomNav already scales that nav as
 * one unit on narrow viewports instead of letting it overflow/clip; this
 * is the same technique generalized to any fixed-width screen body so a
 * 320px-wide device shows the whole confirmed layout, scaled down, rather
 * than cropping the right/bottom edge. Width < 390 scales down; width >=
 * 390 renders at the approved 1:1 size. */
export function FixedCanvas({ height, grow = false, children }: { height: number; /** For screens whose content can be longer than the canvas (many fields, many items): the canvas grows with it instead of clipping it. */ grow?: boolean; children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(height);
  useEffect(() => {
    const inner = innerRef.current;
    if (!grow || !inner) return;
    const measure = () => setContentHeight(Math.max(height, inner.scrollHeight));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(inner);
    for (const child of Array.from(inner.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [grow, height]);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    // A full screen (844 tall) must be reachable on every phone: narrower than 390 it scales down by width; in portrait with
    // less than 844 px of height (a phone minus its status and navigation bars) it scales down by height too, so the buttons
    // at the bottom are not cut off. While a text field has the keyboard open the window is shorter on purpose, so the scale
    // is left alone. In landscape the screen keeps its size and the app shell scrolls (see styles.css).
    const update = () => {
      const active = document.activeElement;
      const typing = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement;
      if (typing) return;
      const app = getAppScale(); // on-screen pixels -> layout pixels when a tablet magnifies the app
      const byWidth = host.offsetWidth / REFERENCE_WIDTH;
      const portrait = window.innerHeight >= window.innerWidth;
      // landscape phones scroll instead (shrinking would make everything tiny); tablets are big enough to fit in any orientation
      const fitsHeight = height >= FULL_SCREEN_MIN_HEIGHT && (portrait || isTabletWindow());
      const byHeight = fitsHeight ? (window.innerHeight / app - host.getBoundingClientRect().top / app) / height : Infinity;
      setScale(Math.max(MIN_SCALE, Math.min(1, byWidth, byHeight)));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);
    window.addEventListener('resize', update);
    return () => { observer.disconnect(); window.removeEventListener('resize', update); };
  }, [height]);

  return (
    <div className={`drawary-fixed-canvas-host${grow ? ' is-grow' : ''}`} ref={hostRef} style={{ height: (grow ? contentHeight : height) * scale, ['--fc-h' as string]: `${height}px` }}>
      <div className="drawary-fixed-canvas-scale" ref={innerRef} style={grow ? { minHeight: height, transform: `translateX(-50%) scale(${scale})` } : { height, transform: `translateX(-50%) scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
