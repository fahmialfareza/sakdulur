import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GuideArticle } from "@/components/marketing/guide-article";
import { BRAND, SITE_URL } from "@/lib/brand";
import { GUIDE_SLUGS } from "@/lib/guides";
import { guide, guides } from "@/lib/guides-content";
import { jsonLd, languageAlternates, localePath, pageSocial } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; slug: string }> };

// Per language: the [locale] layout's generateStaticParams supplies the locales.
export function generateStaticParams() {
  return GUIDE_SLUGS.map((slug) => ({ slug }));
}

export const dynamicParams = false;

async function load({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const g = guide(locale, slug);
  if (!g) notFound();
  return { locale, g };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, g } = await load(props);
  const path = `/guides/${g.slug}`;
  return {
    title: { absolute: `${g.title} · ${BRAND}` },
    description: g.description,
    alternates: languageAlternates(path, locale),
    ...pageSocial(path, locale, g.title, g.description),
  };
}

export default async function GuidePage(props: Props) {
  const { locale, g } = await load(props);
  const t = await getTranslations("guides");
  const tm = await getTranslations("marketing");
  const page = `${SITE_URL}${localePath(locale, `/guides/${g.slug}`)}`;
  const index = `${SITE_URL}${localePath(locale, "/guides")}`;
  // An article by Sakdulur about the topic, its place in the site, and its questions (for answer engines).
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${page}#article`,
        mainEntityOfPage: page,
        url: page,
        headline: g.title,
        description: g.description,
        inLanguage: locale,
        datePublished: g.published,
        dateModified: g.updated,
        image: `${SITE_URL}/opengraph-image`,
        author: { "@id": `${SITE_URL}/#organization` },
        publisher: { "@id": `${SITE_URL}/#organization` },
        isPartOf: { "@id": index },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: BRAND, item: `${SITE_URL}${localePath(locale, "/")}` },
          { "@type": "ListItem", position: 2, name: tm("guides"), item: index },
          { "@type": "ListItem", position: 3, name: g.title, item: page },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${page}#faq`,
        inLanguage: locale,
        mainEntity: g.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <GuideArticle
        guide={g}
        labels={{
          updated: t("updated"),
          contents: t("contents"),
          faq: t("faq"),
          ctaTitle: t("ctaTitle"),
          ctaBody: t("ctaBody"),
          cta: t("cta"),
          more: t("more"),
        }}
        breadcrumb={{ href: localePath(locale, "/guides"), label: tm("guides") }}
        others={guides(locale)
          .filter((o) => o.slug !== g.slug)
          .map((o) => ({ href: localePath(locale, `/guides/${o.slug}`), title: o.title }))}
      />
    </>
  );
}
