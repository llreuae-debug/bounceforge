import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Check for minimum browser capabilities before mounting
function isBrowserSupported(): boolean {
  try {
    const hasCanvas = typeof document !== 'undefined' && 'getContext' in document.createElement('canvas');
    const hasPromise = typeof Promise !== 'undefined';
    const hasFetch = typeof fetch !== 'undefined';
    return !!(hasCanvas && hasPromise && hasFetch);
  } catch {
    return false;
  }
}

const rootEl = document.getElementById('root')!;
// Keep the static boot shell's markup so the first lazy route can show it while loading
// (no flash back to an empty screen between the HTML shell and the real page)
const bootShell = document.getElementById('boot-shell');
(window as any).__bootShell = bootShell && bootShell.innerHTML.trim() ? { html: bootShell.outerHTML, path: location.pathname } : null;

if (!isBrowserSupported()) {
  rootEl.innerHTML = `
    <div style="background:#050608;color:#fff;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Helvetica,Arial,sans-serif;padding:24px;text-align:center;">
      <div style="width:48px;height:48px;border-radius:16px;background:#CCFF00;margin-bottom:16px;display:flex;align-items:center;justify-content:center;color:#000;font-weight:900;font-size:20px;">⚡</div>
      <h1 style="color:#CCFF00;font-size:22px;margin:0 0 10px 0;font-weight:800;letter-spacing:-0.5px;">ur browser is a bit old</h1>
      <p style="color:#94a3b8;font-size:14px;max-width:380px;margin:0 0 24px 0;line-height:1.6;">try chrome, edge, safari or firefox for the full bounceforge experience.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
        <a href="https://www.google.com/chrome/" target="_blank" rel="noopener noreferrer" style="padding:10px 18px;border-radius:12px;background:#CCFF00;color:#000;font-weight:800;text-decoration:none;font-size:12px;text-transform:uppercase;">get chrome</a>
        <a href="https://www.microsoft.com/edge" target="_blank" rel="noopener noreferrer" style="padding:10px 18px;border-radius:12px;background:rgba(255,255,255,0.08);color:#fff;font-weight:700;text-decoration:none;font-size:12px;">edge</a>
        <a href="https://www.apple.com/safari/" target="_blank" rel="noopener noreferrer" style="padding:10px 18px;border-radius:12px;background:rgba(255,255,255,0.08);color:#fff;font-weight:700;text-decoration:none;font-size:12px;">safari</a>
      </div>
    </div>
  `;
} else {
  // Request persistent storage so browser does not evict presets
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }

  // Register Service Worker for offline PWA
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Notify user or dispatch refresh
                  console.log('new version ready, tap to refresh');
                }
              });
            }
          });
        })
        .catch(() => {
          /* service worker unavailable (private mode or unsupported) */
        });
    });
  }

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
