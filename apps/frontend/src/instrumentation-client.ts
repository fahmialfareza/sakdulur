import { loadSentry } from "@/lib/sentry-client";

// Runs on every page, so it stays small: the Sentry SDK is loaded once the page is idle (sentry-client.ts), off the
// critical path of the first paint, and Session Replay is added only in the app section (app-providers.tsx).
if (typeof requestIdleCallback === "function") requestIdleCallback(() => void loadSentry(), { timeout: 4000 });
else setTimeout(() => void loadSentry(), 2000);

// Router transitions before the SDK has loaded are not traced (only 1 in 10 is sampled anyway).
export function onRouterTransitionStart(...args: Parameters<typeof import("@sentry/nextjs").captureRouterTransitionStart>) {
  void loadSentry().then((Sentry) => Sentry?.captureRouterTransitionStart(...args));
}
