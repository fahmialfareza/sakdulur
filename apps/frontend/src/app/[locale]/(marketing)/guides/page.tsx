import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BRAND, SITE_URL } from "@/lib/brand";
import { guides } from "@/lib/guides-content";
import { type LocaleParams, pageLocale } from "@/i18n/static";
import { jsonLd, languageAlternates, localePath, pageSocial } from "@/lib/seo";

export async function generateMetadata(props: LocaleParams): Promise<Metadata> {
  const locale = await pageLocale(props);
  const t = await getTranslations("guides");
  return {
    title: { absolute: t("metaTitle") },
    description: t("metaDescription"),
    alternates: languageAlternates("/guides", locale),
    ...pageSocial("/guides", locale, t("metaTitle"), t("metaDescription")),
  };
}

export default async function GuidesPage(props: LocaleParams) {
  const locale = await pageLocale(props);
  const t = await getTranslations("guides");
  const tm = await getTranslations("marketing");
  const list = guides(locale);
  const page = `${SITE_URL}${localePath(locale, "/guides")}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": page,
        url: page,
        name: t("title"),
        description: t("metaDescription"),
        inLanguage: locale,
        publisher: { "@id": `${SITE_URL}/#organization` },
        hasPart: list.map((g) => ({ "@id": `${SITE_URL}${localePath(locale, `/guides/${g.slug}`)}` })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: BRAND, item: `${SITE_URL}${localePath(locale, "/")}` },
          { "@type": "ListItem", position: 2, name: tm("guides"), item: page },
        ],
      },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <section className="mx-auto max-w-4xl space-y-10 px-4 py-16 sm:px-6">
        <header className="space-y-3 text-center">
          <h1 className="font-display text-4xl font-semibold">{t("title")}</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{t("intro")}</p>
        </header>
        <ul className="grid gap-4 sm:grid-cols-2">
          {list.map((g) => (
            <li key={g.slug}>
              <Link
                href={localePath(locale, `/guides/${g.slug}`)}
                className="flex h-full flex-col gap-2 rounded-2xl border bg-card p-6 transition-colors hover:border-primary"
              >
                <h2 className="font-display text-xl font-semibold">{g.title}</h2>
                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{g.description}</p>
                <span className="text-sm font-medium text-primary">{t("read")} →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
