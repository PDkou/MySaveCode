// Thin entry point -- this app's only "own" logic beyond this file and
// sw.ts is app-mode branching inside the shared @core tree (see
// @core/lib/appMode.ts, set to 'business' via this app's .env
// VITE_APP_MODE). Mirrors family-quest-app/src/main.tsx exactly, just
// importing everything from @core instead of relative paths.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@core/i18n';
import '@core/styles/pretendard.css';
import '@core/styles/global.css';
import App from '@core/App.tsx';
import { applyTheme, getInitialTheme } from '@core/lib/theme.ts';
import { applyColorTheme, getInitialColorTheme } from '@core/lib/colorTheme.ts';

applyTheme(getInitialTheme());
applyColorTheme(getInitialColorTheme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
