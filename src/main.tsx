import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import * as Sentry from "@sentry/react";
import App from './App.tsx';
import './index.css';

Sentry.init({
  dsn: "https://a68848c350e9185df733bf879936e1a9@o4511534518435840.ingest.de.sentry.io/4511534529183824",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// Gracefully catch and handle any unhandled rejections related to Supabase refresh tokens
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const errorMsg = event.reason?.message || event.reason?.toString() || "";
    if (
      errorMsg.includes("Invalid Refresh Token") || 
      errorMsg.includes("Refresh Token Not Found") ||
      errorMsg.includes("refresh_token_not_found")
    ) {
      console.warn("[SUPABASE AUTH SHIELD] Gracefully caught invalid refresh token rejection:", event.reason);
      event.preventDefault(); // Stop standard error propagation
      try {
        // Clear local storage items containing the stale supabase tokens to prevent loops
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes("sb-") || key.includes("supabase"))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (e) {
        console.warn("Could not selectively clear localStorage:", e);
      }
    }
  });

  window.addEventListener("error", (event) => {
    const errorMsg = event.message || "";
    if (
      errorMsg.includes("Invalid Refresh Token") || 
      errorMsg.includes("Refresh Token Not Found") ||
      errorMsg.includes("refresh_token_not_found")
    ) {
      console.warn("[SUPABASE AUTH SHIELD] Gracefully caught global error:", event.error);
      event.preventDefault(); // Stop standard error propagation
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

