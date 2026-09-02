import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import './styles/global.css';
import App from './App.tsx';

// registerType: 'autoUpdate' in vite.config.ts does nothing on its own
// without an actual registerSW() call driving it (mirrors the sibling
// apps' main.tsx for the same reason).
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
