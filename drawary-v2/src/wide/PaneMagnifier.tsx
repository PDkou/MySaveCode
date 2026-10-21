import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

const COLUMN = 430;
const FIT_HEIGHT = 800;

/**
 * Shows a phone-width screen larger inside a wide window, as one piece (like the tablet magnification in AppScaler): the screen is
 * laid out at its own 430 px width and scaled up to at most `max` times, without changing any proportion inside it. It fills the
 * height it is given and scrolls inside itself.
 */
export function PaneMagnifier({ children, max = 1.35 }: { children: ReactNode; max?: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ k: 1, h: 0 });
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      // as wide as the pane allows, but never so large that a whole phone screen (about 800 px tall) no longer fits the pane's height
      const k = Math.max(1, Math.min(max, (host.clientWidth - 32) / COLUMN, host.clientHeight / FIT_HEIGHT));
      setBox({ k, h: host.clientHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [max]);
  return (
    <div className="pane-magnifier" ref={hostRef}>
      <div className="pane-magnifier-inner" style={{ width: COLUMN, height: box.h / box.k, transform: `scale(${box.k})`, marginLeft: -COLUMN / 2 }}>
        {children}
      </div>
    </div>
  );
}
