// The guides' URLs (/en/guides/<slug>, /id/guides/<slug>). A plain module: middleware.ts imports it on the edge
// runtime, and the content lives in guides-content.ts. The slugs are the same in both languages.
export const GUIDE_SLUGS = [
  "cara-membuat-silsilah-keluarga",
  "contoh-silsilah-keluarga",
  "trah-dan-bani",
  "istilah-kekerabatan",
  "gedcom",
] as const;

export type GuideSlug = (typeof GUIDE_SLUGS)[number];

export function isGuideSlug(slug: string): slug is GuideSlug {
  return (GUIDE_SLUGS as readonly string[]).includes(slug);
}
