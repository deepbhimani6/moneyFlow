import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { registerSW } from 'virtual:pwa-register';

// Auto-update Service Worker for PWA
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Force immediate activation of the updated Service Worker
    updateSW(true);
  },
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      // 1. Periodically check for new version every 5 minutes
      setInterval(() => {
        registration.update();
      }, 5 * 60 * 1000);

      // 2. Check for updates whenever the mobile PWA is brought to foreground
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update();
        }
      });
      window.addEventListener('focus', () => {
        registration.update();
      });
    }
  },
});

// Auto-reload the app as soon as the new service worker takes control
let refreshing = false;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
