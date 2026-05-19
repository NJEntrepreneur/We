import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './styles/globals.css';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('Root element #root not found in document');
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
