// Replaces apps/frontend/src/lib/native.ts in the app (vite.config.ts): the same helpers, except those that went
// through the website's session routes, which call the API here instead.
import { sessionRequest } from "@/lib/api/client";
import { API_URL } from "../env";

import { nativePlatform } from "@frontend/lib/native";

export * from "@frontend/lib/native";

/** Where a browser sign-in's binding waits for the deep link back (routes/auth-complete.tsx). */
export const BINDING_KEY = "sakdulur-oauth-binding";

function randomHex(bytes = 32) {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

/**
 * Google (and Apple's web flow) sign-in. The API returns a one-time code through the app's URL scheme to
 * /auth/<p>/complete, where it is exchanged together with this binding.
 * - iPhone and Mac: in a sheet over the app (the plugin's web_auth, ASWebAuthenticationSession), which hands the
 *   scheme URL back here; Apple doesn't allow sign-in to leave the app for the browser.
 * - Elsewhere: in the system browser (the app sends other sites there, src-tauri on_navigation), and the scheme URL
 *   comes back as a deep link.
 */
export async function startBrowserSignIn(provider: "google" | "apple", next: string) {
  const binding = randomHex();
  localStorage.setItem(BINDING_KEY, binding);
  const q = new URLSearchParams({ binding, next, client: "app" });
  const start = `${API_URL}/api/auth/${provider}/start?${q.toString()}`;
  const tauri = tauriInternals();
  const platform = nativePlatform();
  if (!tauri || (platform !== "ios" && platform !== "macos")) {
    window.location.assign(start);
    return;
  }
  const { url } = await tauri.invoke<{ url: string }>("plugin:sakdulur|web_auth", { url: start });
  window.location.assign(appPath(url));
}

/** com.fahmialfareza.sakdulur://auth/google/complete?code=... (or :/auth/...) -> /auth/google/complete?code=... */
function appPath(link: string) {
  const u = new URL(link);
  const path = u.host ? `/${u.host}${u.pathname}` : u.pathname;
  if (!path.startsWith("/auth/")) throw new Error("Sign-in failed");
  return `${path}${u.search}`;
}

function tauriInternals() {
  return (window as unknown as { __TAURI_INTERNALS__?: TauriInternals }).__TAURI_INTERNALS__;
}

type AppleAuthorization = { identityToken: string; authorizationCode?: string; givenName?: string; familyName?: string };
type TauriInternals = { invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T> };

/** Native Sign in with Apple (iPhone and Mac apps, through the app's plugin). Resolves once the session is saved. */
export async function signInWithAppleNative() {
  const tauri = tauriInternals();
  if (!tauri) throw new Error("Sign in with Apple is unavailable");
  const nonce = randomHex();
  // The app hashes the nonce for Apple; the API checks the token against this raw value.
  const response = await tauri.invoke<AppleAuthorization>("plugin:sakdulur|apple_authorize", { nonce });
  const name = [response.givenName, response.familyName].filter(Boolean).join(" ");
  await sessionRequest("apple", { identityToken: response.identityToken, authorizationCode: response.authorizationCode, nonce, name });
}
