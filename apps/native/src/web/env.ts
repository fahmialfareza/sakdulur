// The website build (vite.config.ts, mode "web") reaches the API through the site's Worker (/api/proxy), never
// directly, and its links point at the site it is served from.
export const API_URL = "/api/proxy";
export const SITE_URL = "";
