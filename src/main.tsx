import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import * as Sentry from "@sentry/react";
import App from './App.tsx';
import './index.css';

Sentry.init({
  dsn: "https://a68848c350e9185df733bf879936e1a9@o4511534518435840.ingest.de.sentry.io/4511534529183824",
  release: import.meta.env.VITE_APP_VERSION,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event, hint) {
    const errorMsg = hint.originalException ? String(hint.originalException) : "";
    if (
      errorMsg.includes("Invalid Refresh Token") || 
      errorMsg.includes("Refresh Token Not Found") ||
      errorMsg.includes("refresh_token_not_found")
    ) {
      return null;
    }
    return event;
  }
});

// Gracefully catch and handle any unhandled rejections related to Supabase refresh tokens
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    let errorMsg = "";
    if (typeof event.reason === "string") errorMsg = event.reason;
    else if (event.reason?.message) errorMsg = event.reason.message;
    else if (event.reason?.error_description) errorMsg = event.reason.error_description;
    else {
      try { errorMsg = JSON.stringify(event.reason); } catch(e) {}
    }
    
    if (
      errorMsg.includes("Invalid Refresh Token") || 
      errorMsg.includes("Refresh Token Not Found") ||
      errorMsg.includes("refresh_token_not_found")
    ) {
      console.warn("[SUPABASE AUTH SHIELD] Gracefully caught invalid refresh token rejection:", event.reason);
      event.preventDefault(); // Stop standard error propagation
      event.stopImmediatePropagation();
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
    const errorMsg = event.message || event.error?.message || "";
    if (
      errorMsg.includes("Invalid Refresh Token") || 
      errorMsg.includes("Refresh Token Not Found") ||
      errorMsg.includes("refresh_token_not_found")
    ) {
      console.warn("[SUPABASE AUTH SHIELD] Gracefully caught global error:", event.error);
      event.preventDefault(); // Stop standard error propagation
      event.stopImmediatePropagation();
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes("sb-") || key.includes("supabase"))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (e) {}
    }
  });
}

import { ClerkProvider } from '@clerk/clerk-react';

// Import your publishable key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  console.warn("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY || "pk_test_placeholder"}>
      <App />
    </ClerkProvider>
  </StrictMode>,
);

