import { useNavigate } from 'react-router-dom';

// Plain `navigate(-1)` silently does nothing if there's no earlier in-app
// history entry to go back to -- which is exactly what happens after
// ResumeLastRoute (lastRoute.ts) lands a fresh app boot directly on a
// sub-page via `navigate(path, { replace: true })`. That replace leaves a
// single history entry pointing at the sub-page with nothing before it, so
// on iOS -- where backgrounded PWAs get killed and relaunched into a fresh
// WebView more readily than they do on desktop -- the in-app "뒤로" button
// on that page just stops responding after any relaunch. (Reported twice:
// once before ResumeLastRoute existed, and again after -- same underlying
// "no history to go back to" cause, just a different trigger each time.)
//
// React Router's history package stamps `{ idx, ... }` onto
// `window.history.state` for every entry it manages, starting at 0. `idx >
// 0` means there's at least one earlier in-app entry `navigate(-1)` can
// actually land on; otherwise fall back to a known-safe route instead of a
// dead button.
export function useSmartBack(fallbackPath: string) {
  const navigate = useNavigate();
  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
    } else {
      navigate(fallbackPath, { replace: true });
    }
  };
}
