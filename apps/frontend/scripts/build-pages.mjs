// Assembles the Cloudflare Pages output (.pages/) from an OpenNext build (`opennextjs-cloudflare build`):
// - the static assets, plus OpenNext's prerender cache (cdn-cgi/_next_cache, filled by `populateCache local`)
// - _worker.js/: the Worker (worker.ts around OpenNext), bundled by wrangler with wrangler.jsonc's settings
// - the public pages (/en, /id/privacy, /en/guides/<slug>, ...) and robots.txt, sitemap.xml, llms.txt, the icons and
//   the OG image as static files, copied byte for byte from Next's prerender, so search engines and AI crawlers get
//   the same HTML without running the Worker (static requests are free and unlimited on Pages)
// - _routes.json: those files and the assets skip the Worker; everything else (/, /privacy, the app, /api) runs it
// - _headers: the security headers of next.config.ts and each file's Content-Type for the static responses
// Usage: node scripts/build-pages.mjs (after the OpenNext build; `pnpm build:pages` runs both).
// `pnpm preview:pages` / `deploy:pages` run wrangler's Pages commands from the repo root: in this folder they pick up
// wrangler.jsonc (the Worker's config, still used for bundling) and serve the wrong assets.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The production headers (HSTS on, no dev CSP sources), whatever the shell has.
process.env.NODE_ENV = "production";
const { securityHeaders } = await import("../src/lib/security-headers.ts");
const { locales } = await import("../src/i18n/config.ts");
const { GUIDE_SLUGS } = await import("../src/lib/guides.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assets = join(root, ".open-next/assets");
const prerendered = join(root, ".next/server/app");
const out = join(root, ".pages");

function fail(message) {
  console.error(`build-pages: ${message}`);
  process.exit(1);
}

if (!existsSync(join(root, ".open-next/worker.js"))) fail("no OpenNext build: run `opennextjs-cloudflare build` first");

rmSync(out, { recursive: true, force: true });

// 1. Assets, then the prerender cache the Worker reads through env.ASSETS (opennext.config.ts).
execFileSync("npx", ["opennextjs-cloudflare", "populateCache", "local"], { cwd: root, stdio: "inherit" });
if (!existsSync(join(assets, "cdn-cgi/_next_cache"))) fail("populateCache did not write .open-next/assets/cdn-cgi/_next_cache");
cpSync(assets, out, { recursive: true });

// 2. The Worker. wrangler bundles it as `wrangler deploy` would (keep_names: false, nodejs_compat, the wasm modules);
// Pages takes a `_worker.js` folder whose entry is index.js, uploaded with --no-bundle.
const workerDir = join(out, "_worker.js");
execFileSync("npx", ["wrangler", "deploy", "--dry-run", "--outdir", workerDir], { cwd: root, stdio: "inherit" });
renameSync(join(workerDir, "worker.js"), join(workerDir, "index.js"));
rmSync(join(workerDir, "worker.js.map"), { force: true });
rmSync(join(workerDir, "README.md"), { force: true });

// 3. Public pages: the same list as PUBLIC_PAGES in src/middleware.ts, at their language URLs only. Plain URLs
// (/, /privacy, ...) pick the language per request, so they stay on the Worker.
const pagePaths = ["", "/download", "/guides", "/privacy", "/terms", ...GUIDE_SLUGS.map((s) => `/guides/${s}`)];
const pages = locales.flatMap((l) => pagePaths.map((p) => `/${l}${p}`));
for (const page of pages) {
  const from = join(prerendered, `${page}.html`);
  if (!existsSync(from)) fail(`${page} is not prerendered (${from})`);
  cpSync(from, join(out, `${page}.html`));
}

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

// 4. What skips the Worker: the assets folder's own files and folders (not the prerender cache), and the files above.
// Exact paths, so /en/app still reaches the Worker (and its redirect to /app).
const assetRules = readdirSync(assets)
  .filter((name) => name !== "cdn-cgi")
  .map((name) => (statSync(join(assets, name)).isDirectory() ? `/${name}/*` : `/${name}`));
const exclude = [...assetRules, ...pages, ...files];
if (exclude.length > 100) fail(`_routes.json allows 100 rules, got ${exclude.length}`);
writeFileSync(join(out, "_routes.json"), `${JSON.stringify({ version: 1, include: ["/*"], exclude }, null, 2)}\n`);

// 5. Headers of the static pages and files (the Worker's responses get them from next.config.ts).
const rule = (path, headers) =>
  [path, ...Object.entries(headers).filter(([, v]) => v).map(([k, v]) => `  ${k}: ${v}`)].join("\n");
const security = Object.fromEntries(securityHeaders.map((h) => [h.key, h.value]));
const rules = [...pages.map((p) => rule(p, security)), ...files.map((f) => rule(f, { ...security, ...fileHeaders[f] }))];
writeFileSync(join(out, "_headers"), `${rules.join("\n\n")}\n`);

console.log(`build-pages: .pages/ ready (${pages.length} pages and ${files.length} files static, ${exclude.length} route exclusions)`);
