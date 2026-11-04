# Family Tree — frontend

Next.js 16 (App Router) + React 19, Tailwind CSS 4 with shadcn/ui, TanStack Query, React Flow + ELK for the tree
canvas, next-intl (English / Bahasa Indonesia), next-themes (light / dark). Deployed to Cloudflare Pages without a
Next.js server: the public pages as static files, the app's pages as `apps/native`'s website build (`/app-shell/`), and
the small `edge/worker.ts` as `_worker.js` (`scripts/build-pages.mjs`, `docs/production-setup.md`).

## Run

```bash
cp .env.example .env          # optional in development: localhost defaults are built in
pnpm --filter frontend dev    # http://localhost:3000 (the Go API must run on :4000)
pnpm --filter frontend lint
pnpm --filter frontend check-types
pnpm --filter frontend build
pnpm --filter frontend preview:pages   # the production build locally (http://localhost:8788; set the Worker's
                                       # BACKEND_URL / BFF_SHARED_SECRET with --binding)
```

Deploys run from `.github/workflows/deploy-frontend.yml` on pushes to `main`. `next dev` runs the whole site with
Next.js (`src/middleware.ts`, `src/app/api/*`, the `(app)` pages); production runs the same screens without it:

- `next build` prerenders the public pages per language (`/en`, `/id/privacy`, guides), `robots.txt`, `sitemap.xml`,
  `llms.txt`, icons and the OG image: static files, the same HTML for search engines and AI crawlers.
- `/app`, `/auth/*`, `/admin`, `/invite`: `apps/native`'s website build (`vite build --mode web`), which talks to
  `/api/proxy` like the Next.js pages.
- `edge/worker.ts` (no Next.js, about a millisecond of CPU a request): the language of plain URLs (`/`, `/privacy`:
  cookie, then the visitor's country from the zone's Transform Rule header `x-sakdulur-country`, then
  Accept-Language), the app's pages, and the BFF below. Keep it in step with `src/middleware.ts` and `src/app/api/*`.

## How it talks to the API (BFF)

The browser only talks to this app. Tokens never reach page JavaScript (in production `edge/worker.ts` does all of
this; the route handlers below serve `next dev`):

- `src/app/api/session/*` — login, signup, email verification, logout, Google start. Successful sign-ins store the
  access token (`ft_access`, ~15 min) and refresh token (`ft_refresh`, 30 days) in httpOnly, SameSite=Lax cookies.
- `src/app/auth/google/complete` (in the `(auth)` group) — exchanges Google's one-time code together with the
  browser-bound `ft_oauth_binding` cookie.
- `src/app/api/proxy/[...path]` — forwards `/api/proxy/api/...` to the Go API with the bearer token, refreshes the
  session once on 401, and rejects cross-site state-changing requests.
- `src/middleware.ts` — language: public pages have language URLs (`/en`, `/id/privacy`) served as is; other
  URLs pick the language (`NEXT_LOCALE` cookie, country, `Accept-Language`; see `src/i18n/config.ts`) and are
  rewritten to `/{locale}/path`. Also guards `/app/**` and refreshes an expired access token before server
  components render.
- `src/lib/api/hooks.ts` — TanStack Query hooks; query keys are scoped per tree.

## Layout

- `src/app/[locale]/` holds every page (app URLs are locale-free, see middleware). `(marketing)` — landing, privacy, terms
  (also at `/en/...` and `/id/...`; build their links with `localePath` from `src/lib/seo.ts`),
  prerendered per language and served as static Pages files at their `/en`, `/id` URLs (`scripts/build-pages.mjs`;
  plain URLs go through the Worker for language detection); the header reads the
  `ft_signed_in` hint cookie in the browser. `(auth)` — sign-in flows and `/invite`.
  `(app)/app` — the signed-in app: `/app/t/[treeId]` (canvas), `people`, `families`, `members`, `settings`,
  plus `/app/account` and `/app/onboarding`.
- `src/components/tree-canvas` — React Flow canvas; `layout.ts` turns the API graph into an ELK layered layout
  (couples feed a small union node, children hang below it).
- `src/components/person` — drawer, form (partial dates), quick-add, relatives and sharing panels.
- `messages/en.json`, `messages/id.json` — every UI string; keep both files in sync.
- Design tokens live in `src/app/globals.css` (oklch variables for light and dark).

## Environment

See `.env.example`. Production needs `BACKEND_URL` and `NEXT_PUBLIC_APP_URL` (https). The full list for both apps
is in `docs/production-setup.md`.
