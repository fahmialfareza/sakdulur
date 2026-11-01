# Store Reviews in Discord

Every Monday at 02:00 UTC (09:00 WIB), the **Store Reviews to Discord** workflow
(`.github/workflows/store-reviews.yml`) runs `apps/native/scripts/store-reviews.mjs`.
It posts every Google Play and App Store review written or edited since the last
successful run to a Discord channel, one embed per review: stars, title, text,
version, device, language or country, and author. Ported from catetin.ai and
Dzikir App.

## What each store gives

| Store           | Source                                         | What we get                                                                                                                                                                     |
| --------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google Play     | Android Publisher API `reviews.list`           | Reviews with text, written or edited in the **last 7 days**, translated to English with the original kept                                                                       |
| App Store       | App Store Connect API `customerReviews`        | Reviews with a title and text from iOS, iPadOS and macOS (one app record, `6827420604`)                                                                                         |
| Microsoft Store | Partner Center analytics `reviews`             | Nothing for now: the API needs an Entra ID app, which the personal Partner Center account can't have, so it is skipped. The code is ready if the account moves to a work tenant |
| Snap Store      | None: the Snap Store has no ratings or reviews | Nothing                                                                                                                                                                         |

None of the store APIs expose star-only ratings without text.

Because Play only returns the last 7 days, a scheduled run that starts hours
late can miss a Play review edited right at the edge. To run daily instead,
change the cron to `0 2 * * *`; nothing else needs to change.

## How the window works

There is no saved state. Each run posts reviews from the start of the last
successful `Store reviews` run up to the start of the current one, as shown in
the Actions run history. Dry runs are named `Store reviews (dry run)`, so they
don't count. The very first run has nothing to start from: it only counts the
existing reviews and posts nothing.

If any store fails, the run posts nothing and fails. The next run then covers
the whole gap.

## Setup

Repository secrets, under **Settings → Secrets and variables → Actions**:

| Secret                                                                                            | Description                                                                                                                  |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `DISCORD_REVIEWS_WEBHOOK_URL`                                                                     | Discord channel webhook (channel **Edit → Integrations → Webhooks**)                                                         |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`                                                                | Already used by the Android release ([google-play.md](google-play.md))                                                       |
| `APP_STORE_CONNECT_PRIVATE_KEY_BASE64`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID` | Already used by the Apple releases: base64 of an App Store Connect `.p8` with App Manager, Admin or Customer Support access  |
| `MS_STORE_TENANT_ID`, `MS_STORE_CLIENT_ID`, `MS_STORE_CLIENT_SECRET`                              | Not set: they need a work or school tenant (see [microsoft-store.md](microsoft-store.md)). Microsoft is skipped without them |

## Manual run

- **Actions → Store Reviews to Discord → Run workflow.** Tick **dry run** to
  print the messages in the log instead of posting them.
- Locally (from `apps/native`), with `PLAY_JSON_KEY` (path to the service-account
  JSON), `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_PATH` (path to the `.p8`) and
  `DISCORD_REVIEWS_WEBHOOK_URL` in the shell:

```bash
pnpm store:reviews --since 2026-10-16 --dry-run   # print
pnpm store:reviews --since 2026-10-16             # post
```
