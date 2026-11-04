// The website build's API client (vite.config.ts, mode "web"): apps/frontend's own, which goes through the site's
// Worker (/api/proxy, /api/session) with the session in httpOnly cookies. The language lives in a cookie the
// Worker sets, so the screens are told when it may have changed (intl.tsx listens).
import * as client from "@frontend/lib/api/client";

export * from "@frontend/lib/api/client";

const languageMayHaveChanged = () => window.dispatchEvent(new Event("sakdulur:locale"));

/** Signing in copies the account's language into the cookie. */
export async function sessionRequest<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const data = await client.sessionRequest<T>(path, body);
  languageMayHaveChanged();
  return data;
}

export async function saveLocale(locale: string) {
  await client.saveLocale(locale);
  languageMayHaveChanged();
}

/** The apps' deep-link sign-in (pages/auth.tsx AuthComplete); the site finishes Google and Apple in its Worker. */
export async function exchangeSignInCode(): Promise<never> {
  throw new client.ApiError(404, "Not available on the website");
}
