// The response headers of every page. next.config.ts sends them from the Worker, and scripts/build-pages.mjs writes
// them into the Pages `_headers` file for the public pages that are served as static files.
// A plain module without imports: next.config.ts and the build script load it outside the app.

const isDev = process.env.NODE_ENV !== "production";

// Images are plain <img> tags (photos come from Cloudinary); list extra hosts in NEXT_PUBLIC_IMAGE_HOSTS.
const imageHosts = ["https://res.cloudinary.com", ...(process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "").split(",")]
  .map((h) => h.trim())
  .filter(Boolean)
  .join(" ");

// The browser only talks to this origin (API calls go through /api/proxy), plus the Cloudflare Web Analytics
// beacon that Cloudflare injects (loaded from static.cloudflareinsights.com, reporting to cloudflareinsights.com),
// and reads photos from the image hosts when the tree is saved as a picture (html-to-image embeds them).
// 'unsafe-inline' scripts are needed for Next.js bootstrapping without nonces; React Flow needs inline styles.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${imageHosts}`,
  "font-src 'self' data:",
  `connect-src 'self' https://cloudflareinsights.com ${imageHosts}${isDev ? " ws: http://localhost:*" : ""}`,
  // The offline copy (public/sw.js).
  "worker-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

export const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];
