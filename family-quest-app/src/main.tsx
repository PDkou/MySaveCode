import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import './i18n';
import './styles/pretendard.css';
import './styles/global.css';
import App from './App.tsx';
import { applyTheme, getInitialTheme } from './lib/theme.ts';
import { applyColorTheme, getInitialColorTheme } from './lib/colorTheme.ts';
import { installBackDismissListener } from './lib/backNav.ts';

applyTheme(getInitialTheme());
applyColorTheme(getInitialColorTheme());

// Must run before createRoot(...).render(<App />) below -- see backNav.ts's
// comment on installBackDismissListener for why this ordering (attaching
// before <BrowserRouter>'s own popstate listener exists) is load-bearing,
// not just early-is-safer tidiness.
installBackDismissListener();

// vite-plugin-pwa's registerType: 'autoUpdate' (vite.config.ts) only takes
// effect once something actually calls registerSW() -- without this, the
// plugin falls back to the bare `navigator.serviceWorker.register(...)`
// it auto-injects into index.html, which registers the worker but never
// re-checks for a newer one on its own. Browsers do check on navigation,
// but very lazily (throttled to roughly once/day per spec) -- nowhere
// near often enough for someone who keeps this open as an installed PWA
// and rarely does a real full reload. That silently stuck-on-an-old-build
// state was reported 2026-08 as "가족방이 아직도 보임 / 하드 리프레시를 계속
// 해야 됨" after a fix had already shipped and the user had already hard
// refreshed -- the shipped code was right, it just was never running.
// `immediate: true` registers right away; polling for an update every
// minute plus registerType: 'autoUpdate' means a newly deployed build
// activates and reloads on its own, no manual refresh needed.
const updateIntervalMs = 60_000;
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    setInterval(() => {
      if (registration.installing || !navigator.onLine) return;
      void registration.update();
    }, updateIntervalMs);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
