import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calculator } from "lucide-react";
import { CostCalculator } from "@/components/cost/CostCalculator";
import { Disclaimer } from "@/components/medicine/Disclaimer";
import type { CostRow } from "@/lib/cost";
import { hasLocale, href, type Locale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/getDictionary";
import { pageMeta } from "@/lib/seo";
import { cheapestAlternative, getMedicineDetail } from "@/server/services/medicineDetail.service";
import { costQuery, MAX_COST_ITEMS, MAX_COST_QTY } from "@/server/validators/interaction";

type SP = Promise<Record<string, string | string[] | undefined>>;

// Verified slugs (common long-term medicines); qty defaults to 1 — not a dosing suggestion.
const EXAMPLE = "osartil-50-mg-tablet,amdocal-5-mg-tablet,comet-500-mg-tablet,seclo-20-mg-capsule-delayed-release";

export async function generateMetadata({ params }: PageProps<"/[lang]/cost-calculator">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = getDictionary(lang).cost;
  return pageMeta(lang, "/cost-calculator", { title: t.metaTitle, description: t.subtitle });
}

export default async function CostCalculatorPage({ params, searchParams }: PageProps<"/[lang]/cost-calculator">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const t = dict.cost;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <Calculator className="size-6" aria-hidden />
        </span>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.title}</h1>
      </div>
      <p className="mt-2 text-muted">{t.subtitle}</p>

      <Disclaimer text={dict.disclaimer} className="mt-6" />

      <div className="mt-6">
        <Suspense fallback={<div className="h-14 animate-pulse rounded-2xl border border-border bg-card" />}>
          <Calc lang={lang} t={t} disclaimer={dict.disclaimer} searchParams={searchParams} />
        </Suspense>
      </div>

      <p className="mt-10 text-xs text-muted">{t.note}</p>
    </section>
  );
}

async function Calc({ lang, t, disclaimer, searchParams }: { lang: Locale; t: Dictionary["cost"]; disclaimer: string; searchParams: SP }) {
  const sp = await searchParams;
  const { m } = costQuery.parse({ m: Array.isArray(sp.m) ? sp.m[0] : sp.m });
  const details = await Promise.all(m.map((i) => getMedicineDetail(i.slug))); // "use cache"

  const rows: CostRow[] = [];
  details.forEach((d, i) => {
    if (!d) return; // unknown slug → dropped
    const alt = cheapestAlternative(d);
    rows.push({
      slug: d.slug,
      brand: d.brand,
      strength: d.strength,
      dosageForm: d.dosageForm,
      manufacturerName: d.manufacturerName,
      unitPrice: d.unitPrice,
      priceLabel: d.priceLabel,
      qty: m[i].qty,
      alt: alt && { slug: alt.slug, brand: alt.brand, manufacturerName: alt.manufacturerName, unitPrice: alt.unitPrice },
    });
  });

  return (
    <div className="space-y-6">
      <CostCalculator key={rows.map((r) => r.slug).join(",")} lang={lang} t={{ ...t, disclaimer }} rows={rows} max={MAX_COST_ITEMS} maxQty={MAX_COST_QTY} />
      {rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center">
          <p className="text-muted">{t.empty}</p>
          <Link
            href={href(lang, `/cost-calculator?m=${EXAMPLE}`)}
            className="mt-4 inline-block rounded-full border border-border bg-card px-3 py-1 text-sm transition hover:border-brand"
          >
            {t.example}
          </Link>
        </div>
      )}
      {rows.some((r) => r.alt) && <p className="text-sm text-muted">{t.switchNote}</p>}
    </div>
  );
}
