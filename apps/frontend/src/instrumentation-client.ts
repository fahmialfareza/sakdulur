import { captureException, loadSentry, sentryStarted } from "@/lib/sentry-client";

// Runs on every page, so it stays small: the Sentry SDK (sentry-client.ts) loads on the first interaction, the first
// error or after FALLBACK_MS, so it stays out of the first paint and the time the page takes to settle (Lighthouse's
// measuring window, which never interacts). Session Replay is added only in the app section (app-providers.tsx).
const START_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
const FALLBACK_MS = 10_000;

const fallback = setTimeout(start, FALLBACK_MS);
for (const type of START_EVENTS) addEventListener(type, start, { once: true, passive: true });
addEventListener("error", reportEarly);
addEventListener("unhandledrejection", reportEarly);

function start() {
  for (const type of START_EVENTS) removeEventListener(type, start);
  clearTimeout(fallback);
  void loadSentry();
}

// Uncaught errors before the SDK runs are reported by starting it; once running, its own handlers take over.
function reportEarly(event: ErrorEvent | PromiseRejectionEvent) {
  if (sentryStarted()) return;
  start();
  captureException(event instanceof ErrorEvent ? (event.error ?? event.message) : event.reason);
}

// Navigations are interactions: start the SDK if needed and trace the transition (1 in 10 is sampled).
export function onRouterTransitionStart(...args: Parameters<typeof import("@sentry/nextjs").captureRouterTransitionStart>) {
  void loadSentry().then((Sentry) => Sentry?.captureRouterTransitionStart(...args));
}
