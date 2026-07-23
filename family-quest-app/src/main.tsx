import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './i18n';
import './styles/pretendard.css';
import './styles/global.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
