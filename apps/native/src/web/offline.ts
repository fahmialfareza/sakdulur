// The website build's offline copy (vite.config.ts, mode "web"): the account and its trees are kept by React Query
// in IndexedDB, as in the apps (src/native/offline.ts); public/sw.js of apps/frontend keeps the app's code and
// photos so the site opens without internet.
import * as device from "../native/offline";

export * from "../native/offline";

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => console.warn("offline copy unavailable", err));
}

/** Also drops the service worker's copies (code and photos). */
export async function clearOfflineData() {
  await device.clearOfflineData();
  try {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith("sakdulur-")).map((n) => caches.delete(n)));
  } catch {
    // storage unavailable
  }
}

const USER_KEY = "ft-offline-user";

/** The device copy belongs to one account: when a different one signs in, start over (code and photos too). */
export async function claimOfflineData() {
  if (!navigator.onLine) return;
  try {
    const res = await fetch("/api/proxy/api/me", { credentials: "same-origin", cache: "no-store" });
    const userId = res.ok ? (await res.json())?.data?.user?._id : null;
    if (typeof userId !== "string" || !userId) return;
    const previous = localStorage.getItem(USER_KEY);
    if (previous && previous !== userId) await clearOfflineData();
    localStorage.setItem(USER_KEY, userId);
  } catch {
    // ignore
  }
}
