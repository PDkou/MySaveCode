import { useEffect, useState, type ReactNode } from 'react';
import { appScaleFor, layoutKindFor, setAppScale } from './appScale';
import { setAppLayout } from './appLayout';

/**
 * On a tablet (shorter side >= 600 dp) the app is laid out as on a phone and magnified as one piece, so it fills the window
 * instead of sitting small in the middle. The wrapper is the window's size divided by the scale and is scaled back up with a
 * transform, so everything inside (screens, the approved bottom nav, sheets) keeps exactly its approved proportions.
 * On phones nothing is added at all. While a text field has the keyboard open the window is shorter on purpose: the scale is
 * left alone so the screen does not jump.
 */
export function AppScaler({ children }: { children: ReactNode }) {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const update = () => {
      const a = document.activeElement;
      if (a instanceof HTMLInputElement || a instanceof HTMLTextAreaElement || a instanceof HTMLSelectElement) {
        // keyboard: keep the scale, but follow a width change (rotation)
        setSize((prev) => (Math.abs(prev.w - window.innerWidth) > 40 ? { w: window.innerWidth, h: window.innerHeight } : prev));
        return;
      }
      setSize({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  const s = appScaleFor(size.w, size.h);
  setAppScale(s);
  const layout = layoutKindFor(size.w, size.h);
  useEffect(() => { setAppLayout(layout); document.documentElement.dataset.layoutKind = layout; }, [layout]);
  if (s === 1) return <>{children}</>;
  return (
    <div className="drawary-scaler" style={{ width: size.w / s, height: size.h / s, transform: `scale(${s})` }}>
      {children}
    </div>
  );
}
