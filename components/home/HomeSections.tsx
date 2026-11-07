import Link from "next/link";
import { ArrowRight, ChevronDown, GitCompareArrows, Search, ShieldCheck, TrendingDown, Wallet } from "lucide-react";
import { formatNumber, formatPrice, priceBasis } from "@/lib/format";
import { href, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import { fill } from "@/lib/utils";
import type { HomeData } from "@/server/services/home.service";

type H = Dictionary["home"];

const SECTION = "mx-auto max-w-6xl px-4 pt-14";

export function StatsBar({ lang, h, stats }: { lang: Locale; h: H; stats: HomeData["stats"] }) {
  const items = [
    { n: stats.medicines, label: h.stats.medicines },
    { n: stats.generics, label: h.stats.generics },
    { n: stats.manufacturers, label: h.stats.companies },
    { n: stats.interactions, label: h.stats.interactions },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 pt-10">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card px-4 py-5 text-center">
            <dt className="text-xs text-muted">{s.label}</dt>
            <dd className="mt-1 text-2xl font-bold tracking-tight text-brand">{formatNumber(lang, s.n)}+</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function SavingsShowcase({ lang, h, items }: { lang: Locale; h: H; items: HomeData["savings"] }) {
  if (!items.length) return null;
  return (
    <section className={SECTION}>
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <TrendingDown className="size-5 text-brand" aria-hidden /> {h.savingsTitle}
      </h2>
      <p className="mt-1 text-sm text-muted">{h.savingsSub}</p>
      <ul className="mt-5 grid gap-4 md:grid-cols-2">
        {items.map((s) => (
          <li key={`${s.genericName}-${s.strength}`} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">
                  {s.genericName} <span className="font-normal text-muted">{s.strength}</span>
                </p>
                <p className="text-xs text-muted">
                  {s.dosageForm} · {fill(h.brandsCount, { n: formatNumber(lang, s.brandCount) })}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-bold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                {fill(h.cheaperBy, { pct: formatNumber(lang, s.pct) })}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <PriceBox lang={lang} label={h.mostExpensive} perUnit={h.perUnit} p={s.expensive} tone="muted" />
              <PriceBox lang={lang} label={h.cheapest} perUnit={h.perUnit} p={s.cheap} tone="good" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PriceBox({
  lang,
  label,
  perUnit,
  p,
  tone,
}: {
  lang: Locale;
  label: string;
  perUnit: string;
  p: { slug: string; brand: string; unitPrice: number };
  tone: "muted" | "good";
}) {
  return (
    <Link
      href={href(lang, `/medicine/${p.slug}`)}
      className={
        tone === "good"
          ? "rounded-xl border border-emerald-300/60 bg-emerald-50 p-3 hover:border-emerald-400 transition dark:border-emerald-500/30 dark:bg-emerald-500/10"
          : "rounded-xl border border-border p-3 hover:border-brand transition"
      }
    >
      <span className="block text-xs text-muted">{label}</span>
      <span className="block truncate font-semibold">{p.brand}</span>
      <span className="block font-bold">{formatPrice(lang, p.unitPrice)}</span>
      <span className="block text-xs text-muted">{perUnit}</span>
    </Link>
  );
}

export function PopularGrid({ lang, h, items }: { lang: Locale; h: H; items: HomeData["popular"] }) {
  return (
    <section className={SECTION}>
      <h2 className="mb-4 text-xl font-semibold">{h.popular}</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((m) => (
          <li key={m.slug}>
            <Link
              href={href(lang, `/medicine/${m.slug}`)}
              className="flex h-full flex-col rounded-xl border border-border bg-card p-4 hover:border-brand hover:shadow-md transition"
            >
              <span className="font-semibold">{m.brand}</span>
              <span className="text-sm text-muted">{m.strength}</span>
              <span className="mt-1 truncate text-xs text-muted">{m.genericName}</span>
              {m.unitPrice != null && (
                <span className="mt-3 text-sm font-semibold">
                  {formatPrice(lang, m.unitPrice)}{" "}
                  <span className="text-xs font-normal text-muted">{priceBasis(m.priceLabel, h.perUnit)}</span>
                </span>
              )}
              <span className="mt-auto pt-2 text-xs font-medium text-brand">{fill(h.brandsCount, { n: formatNumber(lang, m.brandCount) })}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const INTERACTION_EXAMPLES = [
  { label: "Napa + Ace", m: "napa-500-mg-tablet,ace-500-mg-tablet" },
  { label: "Farin + Seclo", m: "farin-5-mg-tablet,seclo-20-mg-capsule-delayed-release" },
  { label: "Adecin + Antacid", m: "adecin-500-mg-tablet,antacid-250-mg-400-mg-chewable-tablet" },
];

export function InteractionTeaser({ lang, h }: { lang: Locale; h: H }) {
  return (
    <section className={SECTION}>
      <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
            <GitCompareArrows className="size-6" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold sm:text-xl">{h.interTitle}</h2>
            <p className="mt-1 text-sm text-muted">{h.interBody}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {INTERACTION_EXAMPLES.map((e) => (
                <Link
                  key={e.m}
                  href={href(lang, `/interactions?m=${e.m}`)}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:border-brand transition"
                >
                  {e.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <Link
          href={href(lang, "/interactions")}
          className="group inline-flex shrink-0 items-center gap-1 self-start rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition sm:self-center dark:text-slate-900"
        >
          {h.interCta} <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

const HOW_ICONS = [Search, Wallet, ShieldCheck];

export function HowItWorks({ lang, h }: { lang: Locale; h: H }) {
  return (
    <section className={SECTION}>
      <h2 className="mb-5 text-xl font-semibold">{h.howTitle}</h2>
      <ol className="grid gap-4 sm:grid-cols-3">
        {h.how.map((step, i) => {
          const Icon = HOW_ICONS[i] ?? Search;
          return (
            <li key={step.title} className="relative rounded-2xl border border-border bg-card p-6">
              <span className="absolute top-4 right-5 text-3xl font-bold text-border">{formatNumber(lang, i + 1)}</span>
              <span className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted">{step.body}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function Faq({ h }: { h: H }) {
  return (
    <section className={SECTION}>
      <h2 className="mb-4 text-xl font-semibold">{h.faqTitle}</h2>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {h.faq.map((f) => (
          <details key={f.q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium [&::-webkit-details-marker]:hidden">
              {f.q}
              <ChevronDown className="size-4 shrink-0 text-muted transition group-open:rotate-180" aria-hidden />
            </summary>
            <p className="px-5 pb-4 text-sm text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
