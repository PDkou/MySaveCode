// Thin entry point -- this app's only "own" logic beyond this file and
// sw.ts is app-mode branching inside the shared @core tree (see
// @core/lib/appMode.ts, set to 'business' via this app's .env
// VITE_APP_MODE). Mirrors family-quest-app/src/main.tsx exactly, just
// importing everything from @core instead of relative paths.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import '@core/i18n';
import '@core/styles/pretendard.css';
import '@core/styles/global.css';
import App from '@core/App.tsx';
import { applyTheme, getInitialTheme } from '@core/lib/theme.ts';
import { applyColorTheme, getInitialColorTheme } from '@core/lib/colorTheme.ts';
import { installBackDismissListener } from '@core/lib/backNav.ts';

applyTheme(getInitialTheme());
applyColorTheme(getInitialColorTheme());

// See family-quest-app/src/main.tsx's matching block (and backNav.ts's
// comment on installBackDismissListener) for why this must run before
// createRoot(...).render(<App />) below.
installBackDismissListener();

// See family-quest-app/src/main.tsx's matching block for why this is
// needed -- registerType: 'autoUpdate' in vite.config.ts does nothing on
// its own without an actual registerSW() call driving it.
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
