// Tells IndexNow (Bing, Copilot, Yandex, Seznam, Naver...) that the public pages changed, so they are recrawled
// soon instead of whenever the crawler comes by. Reads the URL list from the live sitemap.
// Usage: node scripts/indexnow.mjs [--dry-run] [--site https://sakdulur.com]
// The key is public by design: it is served at /<key>.txt (public/) to prove the site owns it.

const KEY = "e20e0b249e1b756f8752016fc811362b";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const siteArg = args.indexOf("--site");
const site = (siteArg >= 0 ? args[siteArg + 1] : "https://sakdulur.com").replace(/\/+$/, "");

const sitemap = await fetch(`${site}/sitemap.xml`);
if (!sitemap.ok) throw new Error(`sitemap: HTTP ${sitemap.status}`);
const urlList = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!urlList.length) throw new Error("sitemap lists no URLs");

const body = { host: new URL(site).host, key: KEY, keyLocation: `${site}/${KEY}.txt`, urlList };
console.log(`${urlList.length} URLs:\n${urlList.join("\n")}`);
if (dryRun) process.exit(0);

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});
// 200 = accepted, 202 = accepted while the key is being verified; anything else is an error.
console.log(`IndexNow: HTTP ${res.status} ${await res.text()}`);
if (res.status !== 200 && res.status !== 202) process.exit(1);
