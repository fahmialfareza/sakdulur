// A page open while a new version goes live still points at the old build's chunks, which are gone after the deploy
// (navigation requests and lazy chunks then fail until a reload). Reload once by ourselves; the timestamp keeps it
// from looping when the error is real. Kept tiny: instrumentation-client.ts imports it on every page.
const AUTO_RELOAD_KEY = "ft-error-reload";
const AUTO_RELOAD_GAP_MS = 30_000;

let reloading = false;

/** Whether reloadOnce() has started a reload (errors from the outgoing page are then not worth reporting). */
export const isReloading = () => reloading;

export function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(AUTO_RELOAD_KEY) || 0);
    if (Date.now() - last < AUTO_RELOAD_GAP_MS) return false;
    sessionStorage.setItem(AUTO_RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  reloading = true;
  window.location.reload();
  return true;
}

// Turbopack: "Failed to load chunk …"; webpack: ChunkLoadError / "Loading (CSS) chunk … failed".
const STALE_CHUNK = /Failed to load chunk|ChunkLoadError|Loading (?:CSS )?chunk \S+ failed/;

export function isStaleChunkError(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : typeof error === "string" ? error : "";
  return STALE_CHUNK.test(text);
}
