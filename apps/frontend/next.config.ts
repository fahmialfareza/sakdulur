import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { securityHeaders } from "./src/lib/security-headers";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Render metadata in <head> for every client, not only bots: Next streams it into <body> for browsers by
  // default, which audits (Lighthouse) and some link previews miss.
  htmlLimitedBots: /.*/,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Old single-family URLs now live inside the app shell.
  async redirects() {
    return [
      { source: "/person/:path*", destination: "/app", permanent: false },
      { source: "/person", destination: "/app", permanent: false },
      { source: "/family", destination: "/app", permanent: false },
      { source: "/relationship/:path*", destination: "/app", permanent: false },
      { source: "/tree/:id", destination: "/app?focus=:id", permanent: false },
    ];
  },
};

// Source maps are uploaded to Sentry (and then deleted from the build) only when SENTRY_AUTH_TOKEN is set where the
// build runs. The release is the commit (the deploy workflow's GITHUB_SHA), which the Worker reports as well.
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  release: { name: process.env.GITHUB_SHA || process.env.WORKERS_CI_COMMIT_SHA || undefined },
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
