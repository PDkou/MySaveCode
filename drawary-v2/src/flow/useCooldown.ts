import { useEffect, useState } from 'react';

/** Milliseconds left until `until` (epoch ms), re-read every second while there is any. */
export function useCooldown(until: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (until <= Date.now()) return;
    const timer = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= until) window.clearInterval(timer);
    }, 500);
    return () => window.clearInterval(timer);
  }, [until]);
  return Math.max(0, until - now);
}
