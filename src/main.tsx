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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

