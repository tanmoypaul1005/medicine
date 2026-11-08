import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Camera, GitCompareArrows, ShieldCheck, Wallet } from "lucide-react";
import { ConditionChips } from "@/components/conditions/ConditionViews";
import { Faq, HowItWorks, InteractionTeaser, PopularGrid, SavingsShowcase, StatsBar } from "@/components/home/HomeSections";
import { SearchBar } from "@/components/medicine/SearchBar";
import { listConditions } from "@/server/services/condition.service";
import { getHomeData } from "@/server/services/home.service";
import { Disclaimer } from "@/components/medicine/Disclaimer";
import { hasLocale, href } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { absoluteUrl, pageMeta, SITE_NAME, SITE_URL } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import type { Metadata } from "next";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = getDictionary(lang).meta;
  return pageMeta(lang, "", { title: t.title, description: t.description, absoluteTitle: true });
}

const EXAMPLES = ["napa 500", "paracetamol", "নাপা", "seclo"];

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);
  const h = t.home;
  // Both "use cache" → page stays prerendered; refreshed by the "medicines"/"conditions" cache tags
  const [conditions, data] = await Promise.all([listConditions(), getHomeData()]);

  const features: { icon: typeof Wallet; title: string; body: string; path?: string }[] = [
    { icon: Wallet, ...h.features.alternatives },
    { icon: GitCompareArrows, ...h.features.interactions, path: "/interactions" },
    { icon: ShieldCheck, ...h.features.warnings },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl(lang),
      inLanguage: lang,
      description: t.meta.description,
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl(lang, "/search")}?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    { "@context": "https://schema.org", "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: lang,
      mainEntity: h.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      {/* Hero */}
      {/* z-10 + no overflow-hidden here: the search suggestion dropdown must overflow this section.
          Only the decorative glow is clipped, by its own wrapper. */}
      <section className="relative z-10">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-x-0 -top-40 mx-auto h-112 max-w-4xl rounded-full bg-brand/15 blur-3xl" />
        </div>
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 pt-16 pb-6 text-center sm:pt-24 sm:pb-12">
          <span className="mb-5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted">
            {h.badge}
          </span>
          <h1 className="text-2xl font-bold leading-tight tracking-tight  md:text-5xl">
            {h.titleA}
            <span className="text-brand">{h.titleHighlight}</span>
            {h.titleB}
          </h1>
          <p className="mt-4 max-w-xl text-2xl text-base text-muted md:text-lg">{h.subtitle}</p>

          <SearchBar lang={lang} t={t.search} autoFocus className="mt-8" />

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-muted">
            <span>{h.examples}</span>
            {EXAMPLES.map((s) => (
              <Link
                key={s}
                href={href(lang, `/search?q=${encodeURIComponent(s)}`)}
                className="rounded-full border border-border bg-card px-3 py-1 hover:border-brand hover:text-foreground transition"
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Prescription scan CTA (directly under the hero, above the stats) */}
      <section className="mx-auto max-w-6xl px-4">
        {/* Card is clickable everywhere via the button's stretched ::after; the button is the single,
            real, keyboard-focusable control (visible focus ring on the brand background). */}
        <div className="group relative flex flex-col items-start gap-4 rounded-2xl bg-brand p-6 text-white transition hover:brightness-105 sm:flex-row sm:items-center sm:justify-between sm:p-8 dark:text-slate-900">
          <div className="flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/15">
              <Camera className="size-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-semibold sm:text-xl">{h.scanTitle}</h2>
              <p className="text-sm opacity-85">{h.scanBody}</p>
            </div>
          </div>
          <Link
            href={href(lang, "/scan")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition after:absolute after:inset-0 after:rounded-2xl after:content-[''] hover:bg-slate-800 group-hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/80"
          >
            {h.scanCta} <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
      </section>

      <StatsBar lang={lang} h={h} stats={data.stats} />
      <SavingsShowcase lang={lang} h={h} items={data.savings} />

      {/* Common conditions */}
      <section className="mx-auto max-w-6xl px-4 pt-14">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-semibold">{t.conditions.homeTitle}</h2>
          <Link href={href(lang, "/conditions")} className="text-sm font-medium text-brand hover:underline">
            {t.conditions.seeAll}
          </Link>
        </div>
        <ConditionChips
          lang={lang}
          items={conditions}
          initial={8}
          more={{ show: t.conditions.showMore, hide: t.conditions.showLess }}
        />
      </section>

      <PopularGrid lang={lang} h={h} items={data.popular} />
      <InteractionTeaser lang={lang} h={h} />
      <HowItWorks lang={lang} h={h} />

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pt-14">
        <div className="grid gap-4 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, body, path }) => {
            const inner = (
              <>
                <span className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </>
            );
            const cls = "block h-full rounded-2xl border border-border bg-card p-6";
            return path ? (
              <Link key={title} href={href(lang, path)} className={`${cls} hover:border-brand transition`}>
                {inner}
              </Link>
            ) : (
              <div key={title} className={cls}>
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      <Faq h={h} />

      <section className="mx-auto max-w-6xl px-4 pt-10 pb-12">
        <Disclaimer text={t.disclaimer} />
      </section>
    </>
  );
}
