// Assembles the Cloudflare Pages output (.pages/) after `next build` and apps/native's website build (`pnpm build:pages`
// runs all three). Almost everything is a static file, which Pages serves free and without limits:
// - the public pages (/en, /id/privacy, /en/guides/<slug>, ...), robots.txt, sitemap.xml, llms.txt, the icons and the
//   OG image, copied byte for byte from Next's prerender, so search engines and AI crawlers get the same HTML
// - their code (/_next/static) and the files of public/ (the offline service worker, icons, email images)
// - the app (/app-shell/: apps/native `vite build --mode web`, the same screens as the mobile and desktop apps)
// - 404.html: Next's not-found page
// - _worker.js: edge/worker.ts, small and without Next.js (language pick for the plain URLs, the app's pages, the
//   session proxy), bundled by wrangler
// - _routes.json: the static files skip the Worker; everything else (/, /privacy, the app's paths, /api) runs it
// - _headers: the security headers (lib/security-headers.ts) and each file's Content-Type for the static responses
// Usage: node scripts/build-pages.mjs. `pnpm preview:pages` / `deploy:pages` run wrangler's Pages commands from the
// repo root.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The production headers (HSTS on, no dev CSP sources), whatever the shell has.
process.env.NODE_ENV = "production";
const { securityHeaders } = await import("../src/lib/security-headers.ts");
const { locales } = await import("../src/i18n/config.ts");
const { GUIDE_SLUGS } = await import("../src/lib/guides.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const prerendered = join(root, ".next/server/app");
const appShell = join(root, "../native/dist-web");
const out = join(root, ".pages");

function fail(message) {
  console.error(`build-pages: ${message}`);
  process.exit(1);
}

if (!existsSync(join(root, ".next/BUILD_ID"))) fail("no Next.js build: run `next build` first");
if (!existsSync(join(appShell, "index.html"))) fail("no app build: run `pnpm --filter native build:web` first");

rmSync(out, { recursive: true, force: true });

// 1. public/, the public pages' code, and the app.
cpSync(join(root, "public"), out, { recursive: true });
cpSync(join(root, ".next/static"), join(out, "_next/static"), { recursive: true });
cpSync(appShell, join(out, "app-shell"), { recursive: true });

// 2. Public pages: the same list as PUBLIC_PAGES in edge/worker.ts, at their language URLs. Plain URLs (/, /privacy,
// ...) pick the language per request in the Worker, which serves these same files.
const pagePaths = ["", "/download", "/guides", "/privacy", "/terms", ...GUIDE_SLUGS.map((s) => `/guides/${s}`)];
const pages = locales.flatMap((l) => pagePaths.map((p) => `/${l}${p}`));
for (const page of pages) {
  const from = join(prerendered, `${page}.html`);
  if (!existsSync(from)) fail(`${page} is not prerendered (${from})`);
  cpSync(from, join(out, `${page}.html`));
}
const notFound = join(prerendered, "_not-found.html");
if (!existsSync(notFound)) fail(`the not-found page is not prerendered (${notFound})`);
cpSync(notFound, join(out, "404.html"));

// Metadata routes and llms.txt, with the Content-Type and Cache-Control Next gave them.
const files = ["/robots.txt", "/sitemap.xml", "/llms.txt", "/manifest.webmanifest", "/opengraph-image", "/icon", "/apple-icon.png"];
const fileHeaders = {};
for (const file of files) {
  const body = join(prerendered, `${file}.body`);
  if (!existsSync(body)) fail(`${file} is not prerendered (${body})`);
  cpSync(body, join(out, file));
  const { headers = {} } = JSON.parse(readFileSync(join(prerendered, `${file}.meta`), "utf8"));
  fileHeaders[file] = { "Content-Type": headers["content-type"], "Cache-Control": headers["cache-control"] };
}

// 3. The Worker, bundled by wrangler (as `wrangler deploy` would) with the build's settings compiled in.
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
if (!appUrl && process.env.CI) fail("set NEXT_PUBLIC_APP_URL (the site's origin, for cookies and same-origin checks)");
const work = mkdtempSync(join(tmpdir(), "sakdulur-worker-"));
writeFileSync(
  join(work, "wrangler.json"),
  JSON.stringify({
    name: "sakdulur-pages-worker",
    main: join(root, "edge/worker.ts"),
    compatibility_date: "2026-10-01",
    define: {
      __APP_URL__: JSON.stringify(appUrl),
      __SENTRY_DSN__: JSON.stringify(process.env.NEXT_PUBLIC_SENTRY_DSN || ""),
      // Read by the shared modules (lib/brand.ts, lib/security-headers.ts); a Worker has no process.env.
      "process.env.NODE_ENV": JSON.stringify("production"),
      "process.env.NEXT_PUBLIC_APP_URL": JSON.stringify(appUrl),
      "process.env.NEXT_PUBLIC_IMAGE_HOSTS": JSON.stringify(process.env.NEXT_PUBLIC_IMAGE_HOSTS || ""),
    },
  }),
);
execFileSync(join(root, "node_modules/.bin/wrangler"), ["deploy", "--dry-run", "--outdir", join(work, "dist"), "--config", join(work, "wrangler.json")], {
  cwd: work,
  stdio: "inherit",
});
cpSync(join(work, "dist/worker.js"), join(out, "_worker.js"));
rmSync(work, { recursive: true, force: true });

// 4. What skips the Worker: the static files and folders, the public pages and the files above. Exact paths for the
// pages, so /en/app still reaches the Worker (and its redirect to /app).
const special = new Set(["_worker.js", "404.html", ...locales, ...locales.map((l) => `${l}.html`)]);
const assetRules = readdirSync(out)
  .filter((name) => !special.has(name) && !files.includes(`/${name}`))
  .map((name) => (statSync(join(out, name)).isDirectory() ? `/${name}/*` : `/${name}`));
const exclude = [...assetRules, ...pages, ...files];
if (exclude.length > 100) fail(`_routes.json allows 100 rules, got ${exclude.length}`);
writeFileSync(join(out, "_routes.json"), `${JSON.stringify({ version: 1, include: ["/*"], exclude }, null, 2)}\n`);

// 5. Headers of the static responses (the Worker sets its own).
const rule = (path, headers) =>
  [path, ...Object.entries(headers).filter(([, v]) => v).map(([k, v]) => `  ${k}: ${v}`)].join("\n");
const security = Object.fromEntries(securityHeaders.map((h) => [h.key, h.value]));
const immutable = { "Cache-Control": "public, max-age=31536000, immutable" };
const rules = [
  ...pages.map((p) => rule(p, security)),
  ...files.map((f) => rule(f, { ...security, ...fileHeaders[f] })),
  rule("/app-shell/assets/*", immutable),
  rule("/_next/static/*", immutable),
];
writeFileSync(join(out, "_headers"), `${rules.join("\n\n")}\n`);

console.log(`build-pages: .pages/ ready (${pages.length} pages and ${files.length} files static, the app, ${exclude.length} route exclusions)`);
