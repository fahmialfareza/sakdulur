// Sakdulur's offline copy: the app (apps/native's website build under /app-shell/) opens without internet, with the
// trees opened before (React Query keeps their data in IndexedDB: apps/native src/query-client.ts) and their photos.
// Registered by the app (apps/native src/web/offline.ts). Online, the app's page comes from the network (and the
// copy is updated); offline, or when the network is slow, the last copy answers. Editing needs the network.
//
// Bump VERSION when the caching rules change: older caches are then deleted (also the page caches of the
// Next.js site this replaced).
const VERSION = "9";
const SHELL = `sakdulur-shell-v${VERSION}`;
const PHOTOS = `sakdulur-photos-v${VERSION}`;
const CACHES = [SHELL, PHOTOS];

const NETWORK_WAIT_MS = 4000; // then answer from the copy, if there is one
const MAX_SHELL = 200;
const MAX_PHOTOS = 600;
const PHOTO_HOSTS = ["res.cloudinary.com"];
// The app's page: every app path (/app, /app/t/<id>/people, /auth/login, ...) gets the same one.
const SHELL_PAGE = "/__sakdulur/app-shell";
const APP_PREFIXES = ["/app", "/admin", "/auth", "/invite", "/welcome"];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith("sakdulur-") && !CACHES.includes(name)) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

// {type: "clear"}: signed out (or another account signed in), so nothing of this account stays on the device.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "clear") {
    event.waitUntil(
      Promise.all(CACHES.map((name) => caches.delete(name))).then(() => event.source && event.source.postMessage({ type: "cleared" })),
    );
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // The app's code and fonts: names change with every build, so a saved copy is always right.
    if (url.pathname.startsWith("/app-shell/assets/")) {
      event.respondWith(cacheFirst(req, SHELL, MAX_SHELL));
      return;
    }
    const isAppPage =
      req.mode === "navigate" && APP_PREFIXES.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`));
    if (isAppPage) event.respondWith(appPage(req));
    // Everything else (the public pages, the API through /api/proxy) goes to the network as usual.
    return;
  }
  if (PHOTO_HOSTS.includes(url.hostname)) event.respondWith(cacheFirst(req, PHOTOS, MAX_PHOTOS));
});

/** The app's page from the network (saved for later), or the saved one when offline or slow. */
async function appPage(req) {
  const cache = await caches.open(SHELL);
  const network = fetch(req).then(async (res) => {
    // Only the app itself: a redirect (signed out) or an error page must not replace it.
    if (res.ok && !res.redirected && (res.headers.get("content-type") || "").includes("text/html")) {
      await cache.put(SHELL_PAGE, res.clone());
    }
    return res;
  });
  const saved = await cache.match(SHELL_PAGE);
  if (!saved) return network;
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NETWORK_WAIT_MS));
  try {
    return (await Promise.race([network, timeout])) || saved;
  } catch {
    return saved;
  }
}

async function cacheFirst(req, name, max) {
  const cache = await caches.open(name);
  const saved = await cache.match(req);
  if (saved) return saved;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") {
    await cache.put(req, res.clone());
    void trim(cache, max);
  }
  return res;
}

async function trim(cache, max) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(key);
}
