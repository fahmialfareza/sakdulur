import * as Sentry from "@sentry/react";
import { useEffect } from "react";
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from "react-router-dom";
import { nativePlatform } from "@/lib/native";

// Errors, traces, Session Replay (only when an error happens) and logs of the app, like the website's
// (apps/frontend src/instrumentation-client.ts). Without VITE_SENTRY_DSN nothing is sent.
// The website build (vite.config.ts, mode "web") reports to the website's project, through its tunnel.
const DSN = (__WEB__ ? __WEB_SENTRY_DSN__ : import.meta.env.VITE_SENTRY_DSN) || undefined;

export function initSentry() {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    release: __APP_RELEASE__,
    environment: (__WEB__ ? __WEB_SENTRY_ENVIRONMENT__ : import.meta.env.VITE_SENTRY_ENVIRONMENT) || (import.meta.env.PROD ? "production" : "development"),
    tunnel: __WEB__ ? "/api/monitoring" : undefined,
    // Family trees are private: no user details, cookies, bodies or local variables.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: { allow: ["accept-language", "content-type"] }, response: false },
      httpBodies: [],
      urlQueryParams: { deny: ["token", "code", "binding", "next"] },
      stackFrameVariables: false,
      genAI: { inputs: false, outputs: false },
    },
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1,
    // The Go API has no Sentry, and the extra trace headers would fail its CORS preflight.
    tracePropagationTargets: [],
    replaysSessionSampleRate: 0,
    // The plan has 50 replays a month, shared with the website: 1 in 4 error sessions.
    replaysOnErrorSampleRate: 0.25,
    integrations: [
      Sentry.reactRouterV7BrowserTracingIntegration({ useEffect, useLocation, useNavigationType, createRoutesFromChildren, matchRoutes }),
      // Names, dates and photos of relatives are private: every text, input and image is masked.
      Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true }),
      Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
    ],
  });
  Sentry.setTag("platform", nativePlatform());
  Sentry.setTag("app", __WEB__ ? "web" : "native");
}
