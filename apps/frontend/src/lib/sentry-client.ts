import { CLIENT_COOKIE, isAppClient } from "@/lib/app-client";
import { SENTRY_DATA_COLLECTION, SENTRY_DSN, SENTRY_INITIAL_SCOPE, SENTRY_ENVIRONMENT, SENTRY_TRACES_SAMPLE_RATE, SENTRY_TUNNEL } from "@/lib/sentry";

type SentryModule = typeof import("@sentry/nextjs");

let loading: Promise<SentryModule | null> | undefined;

/**
 * Loads and starts the browser SDK once. It is about half of the marketing pages' JavaScript, so it is not in the
 * first download: instrumentation-client.ts calls this once the page is idle, and the error pages call it right away
 * (an error before then is still reported).
 */
export function loadSentry(): Promise<SentryModule | null> {
  if (!SENTRY_DSN) return Promise.resolve(null);
  loading ??= import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: SENTRY_ENVIRONMENT,
      tunnel: SENTRY_TUNNEL,
      dataCollection: SENTRY_DATA_COLLECTION,
      initialScope: SENTRY_INITIAL_SCOPE,
      tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
      replaysSessionSampleRate: 0,
      // The plan has 50 replays a month, shared with the apps (src/sentry.ts in apps/native): 1 in 4 error sessions.
      replaysOnErrorSampleRate: 0.25,
      integrations: [Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] })],
    });
    // Versions of the desktop and mobile apps that show this site mark themselves with the client cookie.
    const client = document.cookie.match(new RegExp(`(?:^|;\\s*)${CLIENT_COOKIE}=([^;]+)`))?.[1];
    Sentry.setTag("platform", isAppClient(client) ? client : "web");
    return Sentry;
  });
  return loading;
}

/** Reports an error caught by an error boundary, starting Sentry first if the page hasn't yet. */
export function captureException(error: unknown) {
  void loadSentry().then((Sentry) => Sentry?.captureException(error));
}
