import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import './styles/global.css';
import App from './App.tsx';

// registerType: 'autoUpdate' in vite.config.ts does nothing on its own
// without an actual registerSW() call driving it (mirrors the sibling
// apps' main.tsx for the same reason). Skipped for the standalone
// single-file build used for quick live previews (see vite.config.ts's
// __DISABLE_SW__ define and package.json's build:preview script) --
// service workers don't work sandboxed inside that context, and the
// unused chunk it would otherwise try to fetch has nothing to load it
// from there anyway.
if (!__DISABLE_SW__) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
