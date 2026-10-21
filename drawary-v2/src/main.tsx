import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppScaler } from './components/AppScaler';
import './styles.css';
import './theme/themes.css';
import { applyCachedTheme } from './flow/theme';
import { startThemedImages } from './theme/themedImages';

applyCachedTheme();
startThemedImages();

const root = document.getElementById('root');
if (!root) throw new Error('Root element missing');
createRoot(root).render(<StrictMode><AppScaler><App /></AppScaler></StrictMode>);
