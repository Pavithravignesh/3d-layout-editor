import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './design-system/tokens.css';
import './design-system/global.css';
import './i18n';
import { App } from './app/App';
import { useEditor } from './state/editorStore';

if (import.meta.env.DEV) Object.assign(window, { __editor: useEditor });

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
