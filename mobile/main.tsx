import "../app/silver-care.css";
import '../app/partners.css';
import React from 'react';
import {createRoot} from 'react-dom/client';
import App from '../app/page';
import '../app/globals.css';
import '../app/silver-landing.css';
// Build-time override for local simulator testing; release builds use the hosted API.
(globalThis as any).__SILVER_BANK_API__ = (import.meta as any).env.VITE_TIMEBANK_API_URL || '';
document.documentElement.classList.add('native-app');
createRoot(document.getElementById('root')!).render(<App/>);
