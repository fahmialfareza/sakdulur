import Link from "next/link";
import { ExampleTree } from "@/components/marketing/example-tree";
import { Button } from "@/components/ui/button";
import type { Guide, GuideSection } from "@/lib/guides-content";

const anchor = (h: string) => h.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");

function SectionTable({ table }: { table: NonNullable<GuideSection["table"]> }) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-secondary/50">
          <tr>
            {table.head.map((h) => (
              <th key={h} scope="col" className="px-4 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {table.rows.map((row) => (
            <tr key={row.join("|")}>
              {row.map((cell, i) => (
                <td key={i} className={i === 0 ? "px-4 py-2.5 font-medium" : "px-4 py-2.5 text-muted-foreground"}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * A guide (lib/guides-content.ts), laid out like the legal pages (components/common/legal.tsx): title, intro,
 * table of contents and sections, then its FAQ, a call to action and the other guides.
 */
export function GuideArticle({
  guide,
  labels,
  breadcrumb,
  others,
}: {
  guide: Guide;
  labels: { updated: string; contents: string; faq: string; ctaTitle: string; ctaBody: string; cta: string; more: string };
  breadcrumb: { href: string; label: string };
  others: { href: string; title: string }[];
}) {
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <header className="space-y-3">
        <nav className="text-sm">
          <Link href={breadcrumb.href} className="text-primary underline-offset-4 hover:underline">
            ← {breadcrumb.label}
          </Link>
        </nav>
        <h1 className="font-display text-4xl font-semibold leading-tight">{guide.title}</h1>
        <p className="text-sm text-muted-foreground">
          {labels.updated} <time dateTime={guide.updated}>{guide.updated}</time>
        </p>
        <p className="text-lg leading-relaxed">{guide.intro}</p>
      </header>
      <nav aria-label={labels.contents} className="rounded-2xl border bg-card p-5 text-sm">
        <ol className="grid gap-1.5 sm:grid-cols-2">
          {guide.sections.map((s) => (
            <li key={s.h}>
              <a href={`#${anchor(s.h)}`} className="text-primary underline-offset-4 hover:underline">
                {s.h}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {guide.sections.map((s) => (
        <section key={s.h} id={anchor(s.h)} className="scroll-mt-24 space-y-3">
          <h2 className="font-display text-2xl font-semibold">{s.h}</h2>
          {s.figure ? <ExampleTree figure={s.figure} /> : null}
          {s.table ? <SectionTable table={s.table} /> : null}
          {s.p?.map((para) => (
            <p key={para.slice(0, 48)} className="leading-relaxed text-muted-foreground">
              {para}
            </p>
          ))}
          {s.list ? (
            <ul className="list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground marker:text-primary">
              {s.list.map((item) => (
                <li key={item.slice(0, 48)}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
      <section className="space-y-3" aria-labelledby="faq">
        <h2 id="faq" className="font-display text-2xl font-semibold">
          {labels.faq}
        </h2>
        <div className="divide-y rounded-2xl border bg-card">
          {guide.faq.map((f) => (
            <div key={f.q} className="space-y-1.5 p-5">
              <h3 className="font-semibold">{f.q}</h3>
              <p className="leading-relaxed text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-3 rounded-2xl bg-primary p-6 text-primary-foreground">
        <h2 className="font-display text-2xl font-semibold">{labels.ctaTitle}</h2>
        <p className="opacity-90">{labels.ctaBody}</p>
        <Button asChild variant="secondary">
          <Link href="/auth/signup">{labels.cta}</Link>
        </Button>
      </section>
      <footer className="space-y-2 border-t pt-6 text-sm">
        <p className="font-semibold">{labels.more}</p>
        <ul className="space-y-1.5">
          {others.map((o) => (
            <li key={o.href}>
              <Link href={o.href} className="text-primary underline-offset-4 hover:underline">
                {o.title} →
              </Link>
            </li>
          ))}
        </ul>
      </footer>
    </article>
  );
}
