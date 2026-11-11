import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { Buffer } from 'buffer';
window.Buffer = Buffer;
window.global = window;
window.process = { env: {} };

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);