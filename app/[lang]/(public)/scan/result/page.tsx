import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BadgePercent, Camera, ChevronRight, GitCompareArrows } from "lucide-react";
import { InteractionResults } from "@/components/interactions/InteractionResults";
import { Disclaimer } from "@/components/medicine/Disclaimer";
import { formatNumber, formatPrice, priceBasis } from "@/lib/format";
import { hasLocale, href, type Locale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/getDictionary";
import { fill } from "@/lib/utils";
import { checkInteractions } from "@/server/services/interaction.service";
import { getMedicineDetail, type MedicineDetail } from "@/server/services/medicineDetail.service";
import { scanResultQuery } from "@/server/validators/interaction";

type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: PageProps<"/[lang]/scan/result">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  // Personal medicine list → never index
  return { title: getDictionary(lang).scan.resultTitle, robots: { index: false, follow: false } };
}

export default async function ScanResultPage({ params, searchParams }: PageProps<"/[lang]/scan/result">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{dict.scan.resultTitle}</h1>
        <Link
          href={href(lang, "/scan")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:border-brand transition"
        >
          <Camera className="size-4" aria-hidden /> {dict.scan.edit}
        </Link>
      </div>
      <Disclaimer text={dict.disclaimer} className="mt-6" />
      <div className="mt-8">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />}>
          <Results lang={lang} dict={dict} searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

type Cheaper = { slug: string; brand: string; manufacturerName: string | null; unitPrice: number; priceLabel: string | null };

/** Cheapest alternative on the same price basis that is actually cheaper. */
function cheapestAlternative(m: MedicineDetail): Cheaper | null {
  if (m.unitPrice == null) return null;
  const alt = m.alternatives.find((a) => a.priceLabel === m.priceLabel && a.unitPrice < (m.unitPrice as number));
  return alt ? { ...alt } : null;
}

async function Results({ lang, dict, searchParams }: { lang: Locale; dict: Dictionary; searchParams: SP }) {
  const sp = await searchParams;
  const { m } = scanResultQuery.parse({ m: Array.isArray(sp.m) ? sp.m[0] : sp.m });
  const t = dict.scan;
  if (!m.length) return <p className="text-muted">{t.empty}</p>;

  await connection(); // checkInteractions is uncached (Mongoose new Date()) → request-time
  const [details, interactions] = await Promise.all([
    Promise.all(m.map((slug) => getMedicineDetail(slug))), // "use cache"
    m.length >= 2 ? checkInteractions(m) : null,
  ]);
  const meds = details.filter((d): d is MedicineDetail => d !== null);
  const rows = meds.map((med) => ({ med, alt: cheapestAlternative(med) }));
  const withCheaper = rows.filter((r) => r.alt).length;
  const pct = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

  return (
    <div className="space-y-10">
      {withCheaper > 0 && (
        <p className="flex items-center gap-2 rounded-xl bg-brand-soft/60 px-4 py-3 font-medium text-brand">
          <BadgePercent className="size-5" aria-hidden /> {fill(t.cheaperCount, { n: formatNumber(lang, withCheaper) })}
        </p>
      )}

      <ul className="space-y-4">
        {rows.map(({ med, alt }) => (
          <li key={med.slug} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={href(lang, `/medicine/${med.slug}`)} className="text-lg font-semibold hover:text-brand">
                  {med.brand} <span className="font-normal text-muted">{med.strength}</span>
                </Link>
                <p className="text-sm text-muted">
                  {[med.dosageForm, med.generic?.name ?? med.genericNameRaw, med.manufacturerName].filter(Boolean).join(" · ")}
                </p>
              </div>
              <p className="text-right font-semibold">
                {med.unitPrice != null ? formatPrice(lang, med.unitPrice) : t.noPrice}
                {med.unitPrice != null && <span className="block text-xs font-normal text-muted">{priceBasis(med.priceLabel, t.perUnit)}</span>}
              </p>
            </div>

            {alt ? (
              <Link
                href={href(lang, `/medicine/${alt.slug}`)}
                className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-300/60 bg-emerald-50 px-4 py-3 hover:border-emerald-400 transition dark:border-emerald-500/30 dark:bg-emerald-500/10"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-emerald-800 dark:text-emerald-300">{t.cheaper}</span>
                  <span className="font-semibold">{alt.brand}</span>
                  {alt.manufacturerName && <span className="block truncate text-xs text-muted">{alt.manufacturerName}</span>}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-semibold">{formatPrice(lang, alt.unitPrice)}</span>
                  <span className="block text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    {fill(t.save, {
                      amount: formatPrice(lang, (med.unitPrice as number) - alt.unitPrice),
                      pct: pct.format((((med.unitPrice as number) - alt.unitPrice) / (med.unitPrice as number)) * 100),
                    })}
                  </span>
                </span>
              </Link>
            ) : (
              <p className="mt-3 text-sm text-muted">{t.noCheaper}</p>
            )}
            <Link href={href(lang, `/medicine/${med.slug}`)} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
              {t.seeAll} <ChevronRight className="size-4" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      {withCheaper > 0 && <p className="text-sm text-muted">{t.switchNote}</p>}

      {interactions && interactions.items.length >= 2 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <GitCompareArrows className="size-5 text-brand" aria-hidden /> {t.interactionsTitle}
          </h2>
          <InteractionResults lang={lang} t={dict.interactions} result={interactions} />
        </section>
      )}
    </div>
  );
}
