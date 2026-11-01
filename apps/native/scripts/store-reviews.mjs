// Posts new Google Play, App Store and Microsoft Store reviews for Sakdulur
// to Discord. The Snap Store has no ratings or reviews, so there is nothing to
// read there. Run weekly by .github/workflows/store-reviews.yml, which passes
// the window from the last successful run; see apps/native/store/store-reviews.md.
//
//   node apps/native/scripts/store-reviews.mjs --since <ISO> [--until <ISO>]  # post reviews in the window
//   node apps/native/scripts/store-reviews.mjs --since <ISO> --dry-run        # print the Discord messages
//   node apps/native/scripts/store-reviews.mjs --seed                         # first run: count only, post nothing
//
// A store without credentials is skipped. Only reviews with text exist in the
// store APIs: star-only ratings can't be read. If any store fails, nothing is
// posted and the script exits 1.
import { createPrivateKey, sign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";

const PACKAGE_NAME = "com.fahmialfareza.sakdulur";
const ASC_APP_ID = process.env.ASC_APP_ID || "6827420604";
const MS_APP_ID = process.env.MS_STORE_APP_ID || "9N7B6TSCXZ00";
const DAY = 24 * 60 * 60 * 1000;

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const dryRun = args.includes("--dry-run");
const seed = args.includes("--seed");
const until = new Date(flag("--until") ?? Date.now());
// Seeding only counts what is there, so any start works.
const since = new Date(flag("--since") ?? (seed ? until - 7 * DAY : NaN));
if (Number.isNaN(since.getTime()) || Number.isNaN(until.getTime()))
  throw new Error("--since <ISO date> is required (or --seed)");
const inWindow = (date) => date >= since && date < until;

const base64url = (value) =>
  Buffer.from(
    typeof value === "string" ? value : JSON.stringify(value)
  ).toString("base64url");

/** Signed JWT; ES256 needs the raw r||s signature, not DER. */
function jwt(header, payload, key) {
  const input = `${base64url(header)}.${base64url(payload)}`;
  const signature = sign(
    header.alg === "ES256" ? "sha256" : "RSA-SHA256",
    Buffer.from(input),
    {
      key: createPrivateKey(key),
      ...(header.alg === "ES256" && { dsaEncoding: "ieee-p1363" }),
    }
  );
  return `${input}.${signature.toString("base64url")}`;
}

async function getJson(url, init, label) {
  const response = await fetch(url, init);
  const text = await response.text();
  if (!response.ok)
    throw new Error(`${label}: ${response.status} ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

const expandHome = (path) => path.replace(/^~(?=\/)/, homedir());

// --- Google Play ------------------------------------------------------------

async function playReviews() {
  const keyJson =
    process.env.PLAY_JSON_KEY_DATA ||
    (process.env.PLAY_JSON_KEY &&
      (await readFile(expandHome(process.env.PLAY_JSON_KEY), "utf8")));
  if (!keyJson) return null;
  const key = JSON.parse(keyJson);
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt(
    { alg: "RS256", typ: "JWT" },
    {
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: key.token_uri || "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    key.private_key
  );
  const { access_token } = await getJson(
    key.token_uri || "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    },
    "Google token"
  );

  // Play only returns reviews with text changed in the last 7 days.
  const reviews = [];
  let token;
  do {
    const url = new URL(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/reviews`
    );
    url.searchParams.set("maxResults", "100");
    url.searchParams.set("translationLanguage", "en");
    if (token) url.searchParams.set("token", token);
    const page = await getJson(
      url,
      { headers: { Authorization: `Bearer ${access_token}` } },
      "Google Play reviews"
    );
    for (const review of page.reviews ?? []) {
      const comment = review.comments?.find((c) => c.userComment)?.userComment;
      if (!comment) continue;
      const date = new Date(Number(comment.lastModified.seconds) * 1000);
      if (!inWindow(date)) continue;
      const text = comment.text?.trim();
      const original = comment.originalText?.trim();
      reviews.push({
        store: "Google Play",
        rating: comment.starRating,
        text,
        original: original && original !== text ? original : undefined,
        author: review.authorName,
        version: comment.appVersionName,
        device: [
          comment.deviceMetadata?.productName || comment.device,
          comment.androidOsVersion && `Android API ${comment.androidOsVersion}`,
        ]
          .filter(Boolean)
          .join(", "),
        locale: comment.reviewerLanguage,
        date,
      });
    }
    token = page.tokenPagination?.nextPageToken;
  } while (token);
  return reviews;
}

// --- App Store Connect (iOS, iPadOS and macOS share one app record) ---------

async function appStoreReviews() {
  const { ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH, ASC_KEY_BASE64 } =
    process.env;
  if (!ASC_KEY_ID || !ASC_ISSUER_ID || !(ASC_KEY_PATH || ASC_KEY_BASE64))
    return null;
  const privateKey = ASC_KEY_BASE64
    ? Buffer.from(ASC_KEY_BASE64, "base64").toString("utf8")
    : await readFile(expandHome(ASC_KEY_PATH), "utf8");
  const now = Math.floor(Date.now() / 1000);
  const token = jwt(
    { alg: "ES256", kid: ASC_KEY_ID, typ: "JWT" },
    {
      iss: ASC_ISSUER_ID,
      iat: now,
      exp: now + 1200,
      aud: "appstoreconnect-v1",
    },
    privateKey
  );

  const reviews = [];
  let url = `https://api.appstoreconnect.apple.com/v1/apps/${ASC_APP_ID}/customerReviews?sort=-createdDate&limit=200`;
  pages: while (url) {
    const page = await getJson(
      url,
      { headers: { Authorization: `Bearer ${token}` } },
      "App Store reviews"
    );
    for (const { attributes: review } of page.data) {
      const date = new Date(review.createdDate);
      // Newest first, so everything after this is older.
      if (date < since) break pages;
      if (!inWindow(date)) continue;
      reviews.push({
        store: "App Store",
        rating: review.rating,
        title: review.title,
        text: review.body?.trim(),
        author: review.reviewerNickname,
        country: review.territory,
        date,
      });
    }
    url = page.links?.next;
  }
  return reviews;
}

// --- Microsoft Store (needs an Entra ID app linked to Partner Center) -------

async function microsoftReviews() {
  const { MS_STORE_TENANT_ID, MS_STORE_CLIENT_ID, MS_STORE_CLIENT_SECRET } =
    process.env;
  if (!MS_STORE_TENANT_ID || !MS_STORE_CLIENT_ID || !MS_STORE_CLIENT_SECRET)
    return null;
  const { access_token } = await getJson(
    `https://login.microsoftonline.com/${MS_STORE_TENANT_ID}/oauth2/token`,
    {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: MS_STORE_CLIENT_ID,
        client_secret: MS_STORE_CLIENT_SECRET,
        resource: "https://manage.devcenter.microsoft.com",
      }),
    },
    "Microsoft token"
  );

  // Review analytics only have a date and lag about a day, so each run takes
  // whole days ending two days before the window ends; the next run picks up
  // where this one stopped.
  const day = (date) => new Date(Math.floor(date / DAY) * DAY - 2 * DAY);
  const start = day(since);
  const end = day(until);
  if (end <= start) return [];
  const isoDay = (date) => date.toISOString().slice(0, 10);

  const reviews = [];
  let url = `https://manage.devcenter.microsoft.com/v1.0/my/analytics/reviews?applicationId=${MS_APP_ID}&startDate=${isoDay(start)}&endDate=${isoDay(new Date(end - DAY))}&top=1000`;
  while (url) {
    const page = await getJson(
      url,
      { headers: { Authorization: `Bearer ${access_token}` } },
      "Microsoft Store reviews"
    );
    for (const review of page.Value ?? []) {
      const date = new Date(`${String(review.date).slice(0, 10)}T00:00:00Z`);
      if (date < start || date >= end) continue;
      reviews.push({
        store: "Microsoft Store",
        rating: review.rating,
        title: review.reviewTitle,
        text: review.reviewText?.trim(),
        author: review.reviewerName,
        version: review.packageVersion,
        device: [review.deviceType, review.osVersion]
          .filter(Boolean)
          .join(", "),
        country: review.market,
        edited: review.isRevised,
        date,
      });
    }
    const next = page["@nextLink"];
    url = next
      ? new URL(next, "https://manage.devcenter.microsoft.com/v1.0/my/").href
      : undefined;
  }
  return reviews;
}

// --- Discord ----------------------------------------------------------------

const clip = (text, max) =>
  text && text.length > max ? `${text.slice(0, max - 1)}…` : text;

function embed(review) {
  const stars = Math.max(0, Math.min(5, Math.round(review.rating ?? 0)));
  const fields = [
    review.original && { name: "Original", value: clip(review.original, 1024) },
    review.version && { name: "Version", value: review.version, inline: true },
    review.device && { name: "Device", value: review.device, inline: true },
    review.locale && { name: "Language", value: review.locale, inline: true },
    review.country && { name: "Country", value: review.country, inline: true },
  ].filter(Boolean);
  return {
    author: { name: review.store },
    title: clip(
      `${"★".repeat(stars)}${"☆".repeat(5 - stars)}${review.title ? `  ${review.title}` : ""}${review.edited ? " (edited)" : ""}`,
      256
    ),
    description: clip(review.text || "_No text_", 4096),
    color: stars <= 2 ? 0xe74c3c : stars === 3 ? 0xf1c40f : 0x2ecc71,
    fields,
    footer: review.author ? { text: clip(review.author, 2048) } : undefined,
    timestamp: review.date.toISOString(),
  };
}

async function postToDiscord(payload) {
  const webhook = process.env.DISCORD_REVIEWS_WEBHOOK_URL;
  if (!webhook) throw new Error("DISCORD_REVIEWS_WEBHOOK_URL is not set");
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(`${webhook}?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.status === 429) {
      const { retry_after = 1 } = await response.json().catch(() => ({}));
      await new Promise((r) => setTimeout(r, retry_after * 1000 + 250));
      continue;
    }
    if (!response.ok)
      throw new Error(
        `Discord: ${response.status} ${(await response.text()).slice(0, 300)}`
      );
    return;
  }
  throw new Error("Discord: still rate limited after 5 tries");
}

// --- Main -------------------------------------------------------------------

console.log(
  `Reviews from ${since.toISOString()} to ${until.toISOString()}${seed ? " (seed)" : ""}${dryRun ? " (dry run)" : ""}`
);
const sources = {
  "Google Play": playReviews,
  "App Store": appStoreReviews,
  "Microsoft Store": microsoftReviews,
};
const reviews = [];
let failed = false;
for (const [store, read] of Object.entries(sources)) {
  try {
    const found = await read();
    if (found === null) {
      console.log(`${store}: skipped, no credentials`);
      continue;
    }
    console.log(`${store}: ${found.length} review(s)`);
    reviews.push(...found);
  } catch (error) {
    failed = true;
    console.error(`${store}: ${error.message}`);
  }
}

// If a store fails, post nothing and fail the run: the next run then starts
// from the last good one, so nothing is posted twice or lost.
if (failed) process.exit(1);

if (!seed && reviews.length) {
  reviews.sort((a, b) => a.date - b.date);
  // Discord takes up to 10 embeds per message.
  for (let i = 0; i < reviews.length; i += 10) {
    const payload = { embeds: reviews.slice(i, i + 10).map(embed) };
    if (dryRun) console.log(JSON.stringify(payload, null, 2));
    else await postToDiscord(payload);
  }
  console.log(
    `${dryRun ? "Would post" : "Posted"} ${reviews.length} review(s)`
  );
}
