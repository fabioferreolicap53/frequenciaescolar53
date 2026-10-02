import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from '@/App.tsx';
import '@/index.css';
import { restoreAuthStore } from '@/lib/pocketbase';

// Restaura a sessão do localStorage antes da primeira renderização.
restoreAuthStore();

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Elemento raiz #root não encontrado no documento.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
