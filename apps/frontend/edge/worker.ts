// The site's Worker on Cloudflare Pages (_worker.js, built by scripts/build-pages.mjs). Everything else is a static
// file: the public pages per language (/en, /id/privacy, ...), robots.txt, sitemap.xml, llms.txt, the icons and the
// OG image (prerendered by `next build`), and the app (apps/native's website build under /app-shell/). This Worker
// only does what needs a request: no Next.js, so each request takes about a millisecond of CPU (the free plan
// allows 10).
// - plain public URLs (/, /privacy, ...): pick the language (i18n/config.ts pickLocale: cookie, then the IP's country
//   from the zone's Transform Rule, then Accept-Language) and serve /en/... or /id/... as is, like middleware.ts did
// - the app's paths (/app, /auth/..., /admin, /invite, /welcome): the app, after the signed-out redirect
// - the session (BFF): /api/proxy/* adds the bearer token from the httpOnly cookies and refreshes it; /api/session/*
//   and the Google/Apple returns move tokens into those cookies (lib/server/*, app/api/*)
// - /api/locale, /api/monitoring (Sentry tunnel), /api/healthz, /uploads/*, /.well-known app links
// Kept in step with src/middleware.ts and the route handlers, which `next dev` still uses locally.
import { isLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, pickLocale } from "../src/i18n/config";
import { CLIENT_COOKIE, isAppClient } from "../src/lib/app-client";
import { GUIDE_SLUGS } from "../src/lib/guides";
import { safeNext } from "../src/lib/safe-next";
import { securityHeaders } from "../src/lib/security-headers";
import { localePath } from "../src/lib/seo";
import { SIGNED_IN_COOKIE } from "../src/lib/session-hint";

type Env = {
  ASSETS: { fetch: (input: Request | string | URL, init?: RequestInit) => Promise<Response> };
  BACKEND_URL?: string;
  BACKEND_PUBLIC_URL?: string;
  BFF_SHARED_SECRET?: string;
  SENTRY_DSN?: string;
  IOS_APP_IDS?: string;
  ANDROID_CERT_SHA256?: string;
  ANDROID_APP_PACKAGE?: string;
};

type TokenPair = { accessToken: string; accessTokenExpiresAt: string; refreshToken?: string; user?: { locale?: string } };

// Set by scripts/build-pages.mjs from the build's environment.
declare const __APP_URL__: string;
declare const __SENTRY_DSN__: string;

const ACCESS_COOKIE = "ft_access";
const REFRESH_COOKIE = "ft_refresh";
const OAUTH_BINDING_COOKIE = "ft_oauth_binding";
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;
// Clear-Site-Data on sign-out drops the offline copy (lib/server/session.ts CLEAR_OFFLINE_DATA).
const CLEAR_OFFLINE_DATA = '"storage"';

// Public pages, prerendered per language (src/middleware.ts PUBLIC_PAGES).
const PUBLIC_PAGES = new Set(["/", "/download", "/privacy", "/terms", "/guides", ...GUIDE_SLUGS.map((s) => `/guides/${s}`)]);
// The app's pages (apps/native src/main.tsx); /app and /admin need a session.
const APP_PREFIXES = ["/app", "/admin", "/auth", "/invite", "/welcome"];
const APP_SHELL = "/app-shell/";

const SECURITY_HEADERS = securityHeaders.map(({ key, value }) => [key, value] as const);

const worker = {
  async fetch(req: Request, env: Env): Promise<Response> {
    try {
      return await route(req, env);
    } catch (err) {
      console.error("worker error", err instanceof Error ? err.message : err);
      return json({ status: 502, message: "Something went wrong" }, 502);
    }
  },
};

export default worker;

async function route(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path.startsWith("/api/")) return api(req, env, url);
  if (path === "/auth/google/complete" || path === "/auth/apple/complete") return oauthComplete(req, env, url);
  if (path.startsWith("/uploads/")) return uploads(env, url);
  if (path === "/.well-known/apple-app-site-association") return appleAppSiteAssociation(env);
  if (path === "/.well-known/assetlinks.json") return assetLinks(env);
  return page(req, env, url);
}

// ---- pages ----------------------------------------------------------------------------------------------------

async function page(req: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname;
  // The old app shells open /app?client=<platform>: remember it, then drop the parameter.
  const clientParam = url.searchParams.get("client");
  if (clientParam !== null) {
    url.searchParams.delete("client");
    const out = redirect(url.toString());
    if (isAppClient(clientParam)) setCookie(out.headers, CLIENT_COOKIE, clientParam, { maxAge: 365 * 24 * 60 * 60, httpOnly: false });
    return out;
  }
  const appClient = isAppClient(cookie(req, CLIENT_COOKIE));
  const hasSession = !!(cookie(req, ACCESS_COOKIE) || cookie(req, REFRESH_COOKIE));
  if (path === "/welcome" && (!appClient || hasSession)) return redirect(new URL(appClient ? "/app" : "/", url).toString());
  if (appClient && (path === "/" || path === "/en" || path === "/id")) return redirect(new URL("/app", url).toString());

  const lang = url.searchParams.get("lang");
  // Language URLs before /en and /id existed (/?lang=id): moved for good.
  if (PUBLIC_PAGES.has(path) && isLocale(lang)) {
    url.pathname = localePath(lang, path);
    url.searchParams.delete("lang");
    return redirect(url.toString(), 301);
  }
  const prefix = path.split("/")[1];
  if (isLocale(prefix)) {
    // Only public pages have language URLs (those are static files and never get here); the app's stay
    // language-free: remember the choice instead.
    url.pathname = path.slice(prefix.length + 1) || "/";
    const out = redirect(url.toString());
    setCookie(out.headers, LOCALE_COOKIE, prefix, { maxAge: LOCALE_COOKIE_MAX_AGE, httpOnly: false });
    return out;
  }

  if (PUBLIC_PAGES.has(path)) {
    const locale = pickLocale({
      lang,
      cookie: cookie(req, LOCALE_COOKIE),
      country: visitorCountry(req),
      acceptLanguage: req.headers.get("accept-language"),
    });
    // The same address serves either language, so shared caches must not keep it (not no-store: that would keep
    // it out of the back/forward cache).
    return html(await env.ASSETS.fetch(new URL(localePath(locale, path), url)), 200, "private, no-cache");
  }

  if (APP_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    if ((path === "/app" || path.startsWith("/app/") || path === "/admin" || path.startsWith("/admin/")) && !hasSession) {
      const login = new URL(appClient ? "/welcome" : "/auth/login", url);
      login.search = `?next=${encodeURIComponent(path + url.search)}`;
      return redirect(login.toString());
    }
    return html(await env.ASSETS.fetch(new URL(APP_SHELL, url)), 200, "no-cache");
  }

  return html(await env.ASSETS.fetch(new URL("/404", url)), 404, "no-cache");
}

/** A static page with the site's security headers (lib/security-headers.ts). */
function html(res: Response, status: number, cacheControl: string) {
  const headers = new Headers({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": cacheControl });
  for (const [k, v] of SECURITY_HEADERS) headers.set(k, v);
  return new Response(res.ok ? res.body : "Not found", { status: res.ok ? status : 404, headers });
}

// ---- API routes -----------------------------------------------------------------------------------------------

async function api(req: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname;
  if (path.startsWith("/api/proxy/")) return proxy(req, env, url);
  if (path === "/api/session/login" && req.method === "POST") return relayAuth(req, env, "/api/auth/login", pairOf);
  if (path === "/api/session/signup" && req.method === "POST") return relayAuth(req, env, "/api/auth/signup", () => undefined);
  if (path === "/api/session/apple" && req.method === "POST") return relayAuth(req, env, "/api/auth/apple", pairOf);
  if (path === "/api/session/verify-email" && req.method === "POST") {
    return relayAuth(req, env, "/api/auth/verify-email", (d) => pairOf(d.session), { withAccess: true });
  }
  if (path === "/api/session/logout" && req.method === "POST") return logout(req, env);
  if (path === "/api/session/expired" && req.method === "GET") return sessionExpired(req, env, url);
  if (path === "/api/session/google/start" && req.method === "GET") return oauthStart(req, env, url, "google");
  if (path === "/api/session/apple/start" && req.method === "GET") return oauthStart(req, env, url, "apple");
  if (path === "/api/locale" && req.method === "POST") return saveLocale(req, env);
  if (path === "/api/monitoring" && req.method === "POST") return sentryTunnel(req, env);
  if (path === "/api/healthz" && req.method === "GET") return healthz(env);
  return json({ status: 404, message: "Not found" }, 404);
}

const FORWARDED_REQUEST_HEADERS = ["content-type", "accept", "accept-language", "user-agent"];
const FORWARDED_RESPONSE_HEADERS = ["content-type", "content-disposition", "cache-control", "x-request-id"];
// The /api/auth endpoints page code may use; the others answer with tokens and go through /api/session/*.
// "providers" (which sign-ins the API offers) is what the app's sign-in pages ask for.
const AUTH_PATHS = new Set(["providers", "resend-verification", "forgot-password", "reset-password", "change-password", "sessions", "logout-all"]);

/** /api/proxy/<path> -> the API's /<path>, with the session's bearer token; refreshes it once when needed. */
async function proxy(req: Request, env: Env, url: URL): Promise<Response> {
  if (!sameOrigin(req, url)) return json({ status: 403, message: "Cross-site request blocked" }, 403);
  const segments = url.pathname.slice("/api/proxy/".length).split("/").map(decodeURIComponent);
  // "." and ".." would be resolved by new URL(), stepping around these checks.
  if (segments[0] !== "api" || segments.some((s) => s === "." || s === "..") || (segments[1] === "auth" && !AUTH_PATHS.has(segments[2] ?? ""))) {
    return json({ status: 404, message: "Not found" }, 404);
  }
  const target = new URL(`${backendUrl(env)}/${segments.map(encodeURIComponent).join("/")}`);
  target.search = url.search;
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();
  const forward = (token?: string) => {
    const headers = new Headers();
    for (const name of FORWARDED_REQUEST_HEADERS) {
      const value = req.headers.get(name);
      if (value) headers.set(name, value);
    }
    for (const [k, v] of Object.entries({ ...clientIpHeaders(req, env), ...localeHeaders(req) })) headers.set(k, v);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(target, { method: req.method, headers, body, redirect: "manual" });
  };

  let token = cookie(req, ACCESS_COOKIE);
  const refreshToken = cookie(req, REFRESH_COOKIE);
  let refreshed: TokenPair | null = null;
  if (!token && refreshToken) {
    refreshed = await refreshSession(req, env, refreshToken);
    token = refreshed?.accessToken;
  }
  let res = await forward(token);
  if (res.status === 401 && refreshToken && !refreshed) {
    refreshed = await refreshSession(req, env, refreshToken);
    if (refreshed) res = await forward(refreshed.accessToken);
  }

  const headers = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = res.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (refreshed) setSessionCookies(headers, refreshed);
  if (res.status === 401 && (refreshToken || token) && !refreshed) clearSessionCookies(headers);
  return new Response(res.body, { status: res.status, headers });
}

/** Posts the JSON body to an API auth endpoint; a session in the answer moves into the cookies (lib/server/session-route.ts). */
async function relayAuth(
  req: Request,
  env: Env,
  backendPath: string,
  pickSession: (data: Record<string, unknown>) => TokenPair | undefined,
  { withAccess = false } = {},
): Promise<Response> {
  if (!sameOrigin(req, new URL(req.url))) return json({ status: 403, message: "Cross-site request blocked" }, 403);
  const headers: Record<string, string> = { "Content-Type": "application/json", ...clientIpHeaders(req, env), ...localeHeaders(req) };
  const ua = req.headers.get("user-agent");
  if (ua) headers["User-Agent"] = ua;
  const access = cookie(req, ACCESS_COOKIE);
  if (withAccess && access) headers.Authorization = `Bearer ${access}`;
  const res = await fetch(`${backendUrl(env)}${backendPath}`, { method: "POST", headers, body: await req.text() });
  const body = (await res.json().catch(() => null)) as { status: number; data?: Record<string, unknown>; message?: string } | null;
  if (!res.ok || !body?.data) return json(body ?? { status: res.status, message: res.statusText }, res.status);
  const session = pickSession(body.data);
  if (!session) return json(body, res.status);
  // The tokens go into httpOnly cookies only: page code never sees them (the login answer is the pair itself).
  const { accessToken: _a, refreshToken: _r, accessTokenExpiresAt: _e, session: _s, ...rest } = body.data;
  void [_a, _r, _e, _s];
  const out = json({ status: res.status, data: { ...rest, user: session.user } }, res.status);
  setSessionCookies(out.headers, session);
  return out;
}

async function logout(req: Request, env: Env): Promise<Response> {
  if (!sameOrigin(req, new URL(req.url))) return json({ status: 403, message: "Cross-site request blocked" }, 403);
  const token = cookie(req, ACCESS_COOKIE);
  if (token) {
    // Best effort: a slow API must not hold up signing out on this device.
    await fetch(`${backendUrl(env)}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, ...clientIpHeaders(req, env) },
      signal: AbortSignal.timeout(4000),
    }).catch(() => undefined);
  }
  const out = json({ status: 200, data: true }, 200);
  clearSessionCookies(out.headers);
  out.headers.set("Clear-Site-Data", CLEAR_OFFLINE_DATA);
  return out;
}

/** Clears a refused session, but only once the API confirms it, so a link from another site cannot sign anyone out. */
async function sessionExpired(req: Request, env: Env, url: URL): Promise<Response> {
  const next = safeNext(url.searchParams.get("next"), "/app");
  const token = cookie(req, ACCESS_COOKIE);
  const status = token
    ? await fetch(`${backendUrl(env)}/api/me`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(4000) })
        .then((r) => r.status)
        .catch(() => 0)
    : 401;
  if (status !== 401) return redirect(new URL(next, url).toString());
  const out = redirect(new URL(`/auth/login?next=${encodeURIComponent(next)}`, url).toString());
  clearSessionCookies(out.headers);
  return out;
}

/** Google/Apple sign-in: a random binding in this browser's httpOnly cookie; the API only sees its hash. */
function oauthStart(req: Request, env: Env, url: URL, provider: "google" | "apple"): Response {
  const binding = crypto.randomUUID() + crypto.randomUUID();
  const next = safeNext(url.searchParams.get("next"));
  const app = url.searchParams.get("client") === "app";
  const target = new URL(`${(env.BACKEND_PUBLIC_URL || backendUrl(env)).replace(/\/+$/, "")}/api/auth/${provider}/start`);
  target.searchParams.set("binding", binding);
  target.searchParams.set("next", next);
  if (app) target.searchParams.set("client", "app");
  const out = app ? json({ url: target.toString() }, 200, { "Cache-Control": "no-store" }) : redirect(target.toString());
  setCookie(out.headers, OAUTH_BINDING_COOKIE, binding, { maxAge: 10 * 60 });
  return out;
}

/** The API sends Google and Apple sign-ins back here with a one-time code, exchanged with this browser's binding. */
async function oauthComplete(req: Request, env: Env, url: URL): Promise<Response> {
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"), "/app");
  const binding = cookie(req, OAUTH_BINDING_COOKIE);
  const fail = (reason: string) => {
    const out = redirect(new URL(`/auth/login?error=${reason}`, url).toString());
    deleteCookie(out.headers, OAUTH_BINDING_COOKIE);
    return out;
  };
  if (!code || !binding) return fail("google_state");
  const res = await fetch(`${backendUrl(env)}/api/auth/google/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": req.headers.get("user-agent") ?? "", ...clientIpHeaders(req, env) },
    body: JSON.stringify({ code, binding }),
  });
  const body = (await res.json().catch(() => null)) as { data?: TokenPair } | null;
  if (!res.ok || !body?.data?.accessToken) return fail("google_exchange");
  const out = redirect(new URL(next === "/" ? "/app" : next, url).toString());
  deleteCookie(out.headers, OAUTH_BINDING_COOKIE);
  setSessionCookies(out.headers, body.data);
  return out;
}

/** Language switcher: the cookie for a year, and the account's language when signed in. */
async function saveLocale(req: Request, env: Env): Promise<Response> {
  if (!sameOrigin(req, new URL(req.url))) return json({ status: 403, message: "Cross-site request blocked" }, 403);
  const { locale } = (await req.json().catch(() => ({}))) as { locale?: string };
  if (!isLocale(locale)) return json({ status: 400, message: "Unsupported locale" }, 400);
  const access = cookie(req, ACCESS_COOKIE);
  if (access) {
    await fetch(`${backendUrl(env)}/api/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${access}`, ...clientIpHeaders(req, env) },
      body: JSON.stringify({ locale }),
    }).catch(() => null);
  }
  const out = json({ status: 200, data: locale }, 200);
  setCookie(out.headers, LOCALE_COOKIE, locale, { maxAge: LOCALE_COOKIE_MAX_AGE, httpOnly: false });
  return out;
}

/** The browser's Sentry envelopes, forwarded without cookies, and only for our own DSNs. */
async function sentryTunnel(req: Request, env: Env): Promise<Response> {
  const body = await req.arrayBuffer();
  const header = new TextDecoder().decode(body.slice(0, 4096)).split("\n")[0];
  let dsn: URL;
  try {
    dsn = new URL((JSON.parse(header) as { dsn: string }).dsn);
  } catch {
    return new Response(null, { status: 400 });
  }
  const allowed = [env.SENTRY_DSN, __SENTRY_DSN__].filter(Boolean).some((d) => {
    try {
      const a = new URL(d as string);
      return a.host === dsn.host && a.pathname === dsn.pathname && a.username === dsn.username;
    } catch {
      return false;
    }
  });
  if (!allowed) return new Response(null, { status: 403 });
  const project = dsn.pathname.replace(/^\/+/, "");
  const res = await fetch(`https://${dsn.host}/api/${project}/envelope/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-sentry-envelope" },
    body,
  });
  return new Response(null, { status: res.status });
}

/** Is the Worker configured, and can it reach the API (and how fast)? Only booleans, statuses and timings. */
async function healthz(env: Env): Promise<Response> {
  const config = { appUrl: !!__APP_URL__, backendUrl: !!env.BACKEND_URL, backendPublicUrl: !!env.BACKEND_PUBLIC_URL, bffSecret: !!env.BFF_SHARED_SECRET };
  let backend: { ok: boolean; status?: number; ms?: number; error?: string } = { ok: false, error: "BACKEND_URL is not set" };
  if (env.BACKEND_URL) {
    const start = Date.now();
    try {
      const res = await fetch(`${backendUrl(env)}/readyz`, { signal: AbortSignal.timeout(5000) });
      backend = { ok: res.ok, status: res.status, ms: Date.now() - start };
    } catch (err) {
      backend = { ok: false, ms: Date.now() - start, error: err instanceof Error ? err.name : "fetch failed" };
    }
  }
  const ok = config.appUrl && backend.ok;
  return json({ ok, config, backend }, ok ? 200 : 503, { "Cache-Control": "no-store" });
}

/** Photos in development (the API serves /uploads/* when Cloudinary is not configured). */
async function uploads(env: Env, url: URL): Promise<Response> {
  const res = await fetch(`${backendUrl(env)}${url.pathname}`);
  if (!res.ok) return new Response(null, { status: res.status });
  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

// iOS universal links and Android App Links (app/.well-known/*): served only when configured.
const APP_PATHS = ["/invite*", "/auth/verify-email*", "/auth/reset-password*", "/app*"];

function list(value: string | undefined) {
  return (value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

function appleAppSiteAssociation(env: Env): Response {
  const appIDs = list(env.IOS_APP_IDS);
  if (!appIDs.length) return new Response("Not found", { status: 404 });
  return json(
    { applinks: { details: [{ appIDs, components: APP_PATHS.map((p) => ({ "/": p })) }] }, webcredentials: { apps: appIDs } },
    200,
    { "Cache-Control": "public, max-age=3600" },
  );
}

function assetLinks(env: Env): Response {
  const fingerprints = list(env.ANDROID_CERT_SHA256).map((s) => s.toUpperCase());
  if (!fingerprints.length) return new Response("Not found", { status: 404 });
  return json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls", "delegate_permission/common.get_login_creds"],
        target: { namespace: "android_app", package_name: env.ANDROID_APP_PACKAGE || "com.fahmialfareza.sakdulur", sha256_cert_fingerprints: fingerprints },
      },
    ],
    200,
    { "Cache-Control": "public, max-age=3600" },
  );
}

// ---- session helpers ------------------------------------------------------------------------------------------

function backendUrl(env: Env) {
  return (env.BACKEND_URL || "http://localhost:4000").replace(/\/+$/, "");
}

function pairOf(value: unknown): TokenPair | undefined {
  return value && typeof value === "object" && "accessToken" in value ? (value as TokenPair) : undefined;
}

/** Exchanges the refresh token for a new pair; null when the session is gone. */
async function refreshSession(req: Request, env: Env, refreshToken: string): Promise<TokenPair | null> {
  const ua = req.headers.get("user-agent");
  const res = await fetch(`${backendUrl(env)}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(ua ? { "User-Agent": ua } : {}), ...clientIpHeaders(req, env) },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => null);
  if (!res?.ok) return null;
  const body = (await res.json().catch(() => null)) as { data?: TokenPair } | null;
  return body?.data?.accessToken ? body.data : null;
}

function setSessionCookies(headers: Headers, pair: TokenPair) {
  const expiresIn = Math.floor((new Date(pair.accessTokenExpiresAt).getTime() - Date.now()) / 1000);
  setCookie(headers, ACCESS_COOKIE, pair.accessToken, { maxAge: Math.max(expiresIn - 30, 30) });
  // Absent when another request rotated the token a moment ago: keep the refresh cookie it set.
  if (pair.refreshToken) {
    setCookie(headers, REFRESH_COOKIE, pair.refreshToken, { maxAge: REFRESH_MAX_AGE });
    setCookie(headers, SIGNED_IN_COOKIE, "1", { maxAge: REFRESH_MAX_AGE, httpOnly: false });
  }
  // The account's language wins over whatever this browser had.
  if (isLocale(pair.user?.locale)) setCookie(headers, LOCALE_COOKIE, pair.user.locale, { maxAge: LOCALE_COOKIE_MAX_AGE, httpOnly: false });
}

function clearSessionCookies(headers: Headers) {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, SIGNED_IN_COOKIE]) deleteCookie(headers, name);
}

/** The API trusts X-Client-IP only with the shared secret (lib/server/env.ts clientIpHeaders). */
function clientIpHeaders(req: Request, env: Env): Record<string, string> {
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return env.BFF_SHARED_SECRET && ip ? { "X-BFF-Secret": env.BFF_SHARED_SECRET, "X-Client-IP": ip } : {};
}

/** The visitor's language, so the API can email them in it (lib/server/env.ts localeHeaders). */
function localeHeaders(req: Request): Record<string, string> {
  return {
    "X-Locale": pickLocale({
      cookie: cookie(req, LOCALE_COOKIE),
      country: visitorCountry(req),
      acceptLanguage: req.headers.get("accept-language"),
    }),
  };
}

/**
 * The visitor's country from their IP. The zone's Transform Rule "Visitor country for the site's language pick"
 * (free plan, http_request_late_transform) sets x-sakdulur-country to ip.src.country on sakdulur.com, overwriting
 * whatever the browser sent; Cloudflare's request.cf and the CF-IPCountry header are fallbacks.
 */
function visitorCountry(req: Request): string | null {
  return req.headers.get("x-sakdulur-country") || (req as { cf?: { country?: string } }).cf?.country || req.headers.get("cf-ipcountry");
}

/** Rejects cross-site state-changing requests (lib/server/session.ts isSameOrigin). */
function sameOrigin(req: Request, url: URL) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;
  const origin = req.headers.get("origin");
  if (origin) return origin === url.origin || (!!__APP_URL__ && origin === new URL(__APP_URL__).origin);
  return req.headers.get("sec-fetch-site") === "same-origin";
}

// ---- small helpers --------------------------------------------------------------------------------------------

function cookie(req: Request, name: string): string | undefined {
  const match = (req.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!match) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function setCookie(headers: Headers, name: string, value: string, { maxAge, httpOnly = true }: { maxAge: number; httpOnly?: boolean }) {
  const secure = __APP_URL__.startsWith("https://");
  headers.append(
    "Set-Cookie",
    `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${httpOnly ? "; HttpOnly" : ""}${secure ? "; Secure" : ""}`,
  );
}

function deleteCookie(headers: Headers, name: string) {
  headers.append("Set-Cookie", `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
}

function json(body: unknown, status: number, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...extra } });
}

function redirect(location: string, status = 307) {
  return new Response(null, { status, headers: { Location: location } });
}
