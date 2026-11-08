import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";
import { guides } from "@/lib/guides-content";
import { LEGAL_UPDATED } from "@/lib/legal-content";
import { localePath } from "@/lib/seo";

// Public pages only. Each is listed once per language (/en, /id) with hreflang alternates, so both the
// English and the Indonesian version get indexed.
const PAGES: { path: string; priority: number; changeFrequency: "monthly" | "yearly"; lastModified?: string }[] = [
  { path: "/", priority: 1, changeFrequency: "monthly" },
  { path: "/download", priority: 0.8, changeFrequency: "monthly" },
  { path: "/guides", priority: 0.6, changeFrequency: "monthly" },
  // Both languages share one entry pair: the later of their two update dates (ISO dates compare as strings).
  ...guides("en").map((g, i) => {
    const id = guides("id")[i].updated;
    return { path: `/guides/${g.slug}`, priority: 0.7, changeFrequency: "monthly" as const, lastModified: id > g.updated ? id : g.updated };
  }),
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly", lastModified: LEGAL_UPDATED },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly", lastModified: LEGAL_UPDATED },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PAGES.flatMap(({ path, priority, changeFrequency, lastModified }) => {
    const url = (lang: string) => `${SITE_URL}${localePath(lang, path)}`;
    const languages = { en: url("en"), id: url("id"), "x-default": url("en") };
    return (["id", "en"] as const).map((lang) => ({
      url: languages[lang],
      lastModified: lastModified ? new Date(lastModified) : now,
      changeFrequency,
      priority,
      alternates: { languages },
    }));
  });
}
