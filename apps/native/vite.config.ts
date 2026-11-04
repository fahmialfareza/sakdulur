import { fileURLToPath } from "node:url";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, normalizePath, type Plugin } from "vite";
import pkg from "./package.json" with { type: "json" };

// The app's screens are apps/frontend's components (imported through "@/"). Next.js-only modules are swapped for
// small shims (src/shims), and the three modules that talk to the website's server (BFF) for app versions that
// call the API directly (src/native). See README.md.
const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const frontend = here("../frontend/src");
const host = process.env.TAURI_DEV_HOST;

// apps/frontend modules the app replaces, however they are imported ("@/lib/...", or "./client" from hooks.ts).
// A replacement still reaches its own original (imported as "@frontend/lib/...").
// Paths in forward-slash form, as Vite reports them (also on Windows).
const nativeOverrides: Record<string, string> = {
  [normalizePath(`${frontend}/lib/api/client.ts`)]: normalizePath(here("src/native/api-client.ts")),
  [normalizePath(`${frontend}/lib/native.ts`)]: normalizePath(here("src/native/native.ts")),
  [normalizePath(`${frontend}/lib/offline.ts`)]: normalizePath(here("src/native/offline.ts")),
};

// `vite build --mode web`: the same screens for sakdulur.com, served as static files by the site's Worker
// (apps/frontend edge/worker.ts) instead of Next.js rendering them. The website's own API client and session
// (httpOnly cookies through the Worker's /api/proxy), its language cookie, and its offline copy.
const webOverrides: Record<string, string> = {
  [normalizePath(`${frontend}/lib/api/client.ts`)]: normalizePath(here("src/web/api-client.ts")),
  [normalizePath(`${frontend}/lib/offline.ts`)]: normalizePath(here("src/web/offline.ts")),
  [normalizePath(`${frontend}/lib/native.ts`)]: normalizePath(here("src/web/native.ts")),
  [normalizePath(here("src/native/session.ts"))]: normalizePath(here("src/web/session.ts")),
  [normalizePath(here("src/locale.ts"))]: normalizePath(here("src/web/locale.ts")),
  [normalizePath(here("src/env.ts"))]: normalizePath(here("src/web/env.ts")),
};

/** The website build's page head: its icons and manifest (the app's come from src-tauri). */
function webHead(): Plugin {
  return {
    name: "sakdulur-web-head",
    transformIndexHtml: () => [
      { tag: "link", attrs: { rel: "icon", href: "/icon", type: "image/png" }, injectTo: "head" },
      { tag: "link", attrs: { rel: "apple-touch-icon", href: "/apple-icon.png" }, injectTo: "head" },
      { tag: "link", attrs: { rel: "manifest", href: "/manifest.webmanifest" }, injectTo: "head" },
      { tag: "meta", attrs: { name: "robots", content: "noindex" }, injectTo: "head" },
    ],
  };
}

function appOverrides(overrides: Record<string, string>): Plugin {
  return {
    name: "sakdulur-app-overrides",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!importer) return null;
      // "@frontend/..." always means the original (what a replacement builds on), never a replacement: resolved here,
      // past this plugin (an alias would hand this plugin the plain path again).
      if (source.startsWith("@frontend/")) {
        return this.resolve(`${frontend}/${source.slice("@frontend/".length)}`, importer, { ...options, skipSelf: true });
      }
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      const target = resolved && overrides[normalizePath(resolved.id)];
      // A replacement importing its own original gets the original.
      return target && target !== normalizePath(importer) ? target : null;
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const web = mode === "web";
  // The website build reads the website's settings (apps/frontend/.env and the deploy's environment).
  const env = { ...loadEnv(mode, here("."), ""), ...(web ? loadEnv("production", here("../frontend"), "") : {}) };
  // Without it the app would talk to http://localhost:4000 (src/env.ts): fail the build instead.
  if (command === "build" && !web && !env.VITE_API_URL) throw new Error("Set VITE_API_URL (the Go API) to build the app; see .env.example");
  const siteUrl = (web ? env.NEXT_PUBLIC_APP_URL || "https://sakdulur.com" : env.VITE_SITE_URL || "https://sakdulur.com").replace(/\/+$/, "");
  const release = web ? `sakdulur-web@${(env.GITHUB_SHA || pkg.version).slice(0, 12)}` : `sakdulur-app@${pkg.version}`;
  const uploadSourceMaps = !!env.SENTRY_AUTH_TOKEN;
  const outDir = web ? "dist-web" : "dist";
  return {
    // The website serves the build under /app-shell/ (its pages keep their own paths: /app, /auth/login, ...).
    base: web ? "/app-shell/" : "/",
    plugins: [
      appOverrides(web ? webOverrides : nativeOverrides),
      ...(web ? [webHead()] : []),
      react(),
      tailwindcss(),
      ...(uploadSourceMaps
        ? [
            sentryVitePlugin({
              org: env.SENTRY_ORG,
              project: web ? env.SENTRY_PROJECT : env.SENTRY_NATIVE_PROJECT || env.SENTRY_PROJECT,
              authToken: env.SENTRY_AUTH_TOKEN,
              release: { name: release },
              sourcemaps: { filesToDeleteAfterUpload: [`${outDir}/**/*.map`] },
              telemetry: false,
            }),
          ]
        : []),
    ],
    resolve: {
      alias: [
        { find: /^@\//, replacement: `${frontend}/` },
        { find: /^next\/link$/, replacement: here("src/shims/link.tsx") },
        { find: /^next\/navigation$/, replacement: here("src/shims/navigation.ts") },
        { find: /^next-intl$/, replacement: here("src/shims/intl.tsx") },
      ],
      // One copy of each library that holds React state or context, whichever app's file imports it.
      dedupe: ["react", "react-dom", "@tanstack/react-query", "next-themes", "sonner", "use-intl"],
    },
    define: {
      // apps/frontend code reads these (lib/brand.ts, lib/sentry.ts): the public site, for links people share.
      "process.env.NODE_ENV": JSON.stringify(mode === "production" ? "production" : "development"),
      "process.env.NEXT_PUBLIC_APP_URL": JSON.stringify(siteUrl),
      "process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT": JSON.stringify(""),
      "process.env.NEXT_PUBLIC_SENTRY_DSN": JSON.stringify(""),
      "process.env.NEXT_PUBLIC_ENABLE_SW": JSON.stringify(""),
      "process.env.NEXT_PUBLIC_IMAGE_HOSTS": JSON.stringify(env.NEXT_PUBLIC_IMAGE_HOSTS || ""),
      // apps/frontend code that must use react-router here instead of Next.js behavior (tree-canvas.tsx).
      "process.env.NEXT_PUBLIC_SPA": JSON.stringify("1"),
      // src/sentry.ts: the website's Sentry project, through the site's tunnel (/api/monitoring).
      __WEB__: JSON.stringify(web),
      __WEB_SENTRY_DSN__: JSON.stringify(web ? env.NEXT_PUBLIC_SENTRY_DSN || "" : ""),
      __WEB_SENTRY_ENVIRONMENT__: JSON.stringify(web ? env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "" : ""),
      "process.env.NEXT_PUBLIC_CONTACT_EMAIL": JSON.stringify(env.NEXT_PUBLIC_CONTACT_EMAIL || ""),
      "process.env.NEXT_PUBLIC_OPERATOR_NAME": JSON.stringify(env.NEXT_PUBLIC_OPERATOR_NAME || ""),
      __APP_RELEASE__: JSON.stringify(release),
    },
    build: {
      outDir,
      // Uploaded to Sentry, then deleted (never shipped in the app).
      sourcemap: uploadSourceMaps ? "hidden" : false,
      target: ["es2021", "safari15"],
    },
    // Nothing of the website's public/ (its service worker and email images) belongs in the app.
    publicDir: false,
    clearScreen: false,
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
      watch: { ignored: ["**/src-tauri/**"] },
      fs: { allow: [here(".."), here("../../node_modules")] },
    },
    envPrefix: ["VITE_", "TAURI_"],
  };
});
