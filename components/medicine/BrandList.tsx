import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { formatNumber, formatPrice, priceBasis } from "@/lib/format";
import { href, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import { fill } from "@/lib/utils";
import type { BrandList as BrandListData, BrandRow } from "@/server/services/medicine.service";
import type { MedicineListQuery } from "@/server/validators/medicine";
import { listHref } from "@/lib/medicineListUrl";
import { PageLink } from "./MedicineTable";

type T = Dictionary["medicines"];

const HERBAL = (t: T) => (
  <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 align-middle text-[10px] font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
    {t.herbal}
  </span>
);

/** Price summary for a brand: per-unit range, else the cheapest pack price with its label. */
function BrandPrice({ lang, t, b }: { lang: Locale; t: T; b: BrandRow }) {
  if (b.minUnit != null) {
    const range =
      b.maxUnit != null && b.maxUnit !== b.minUnit
        ? `${formatPrice(lang, b.minUnit)} – ${formatPrice(lang, b.maxUnit)}`
        : formatPrice(lang, b.minUnit);
    return (
      <span className="block text-right">
        <span className="block font-semibold">{range}</span>
        <span className="block text-xs text-muted">{t.perUnit}</span>
      </span>
    );
  }
  const pack = b.variants.filter((v) => v.unitPrice != null).sort((a, z) => a.unitPrice! - z.unitPrice!)[0];
  if (!pack) return <span className="text-sm text-muted">{t.noPrice}</span>;
  return (
    <span className="block text-right">
      <span className="block font-semibold">
        <span className="text-xs font-normal text-muted">{t.from} </span>
        {formatPrice(lang, pack.unitPrice!)}
      </span>
      <span className="block text-xs text-muted">{priceBasis(pack.priceLabel, t.perUnit)}</span>
    </span>
  );
}

function BrandHead({ lang, t, b }: { lang: Locale; t: T; b: BrandRow }) {
  return (
    <span className="flex min-w-0 flex-1 items-center justify-between gap-4">
      <span className="min-w-0">
        <span className="font-semibold">{b.brand}</span>
        {b.type === "herbal" && HERBAL(t)}
        <span className="block truncate text-sm text-muted">
          {[b.manufacturerName, b.genericNames.join(", ")].filter(Boolean).join(" · ")}
        </span>
        <span className="text-xs font-medium text-brand">{fill(t.variantsCount, { n: formatNumber(lang, b.variants.length) })}</span>
      </span>
      <BrandPrice lang={lang} t={t} b={b} />
    </span>
  );
}

export function BrandList({ lang, t, query, data }: { lang: Locale; t: T; query: MedicineListQuery; data: BrandListData }) {
  const { rows, total, page, pages } = data;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{fill(t.brandTotal, { n: formatNumber(lang, total) })}</p>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-8 text-center text-muted">{t.empty}</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {rows.map((b) =>
            b.variants.length === 1 ? (
              // Single strength/form → link straight to its page
              <li key={b.key}>
                <Link href={href(lang, `/medicine/${b.variants[0].slug}`)} className="flex items-center gap-3 px-4 py-3 hover:bg-brand-soft/30 transition">
                  <BrandHead lang={lang} t={t} b={b} />
                  <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            ) : (
              <li key={b.key}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-brand-soft/30 transition [&::-webkit-details-marker]:hidden">
                    <BrandHead lang={lang} t={t} b={b} />
                    <ChevronDown className="size-4 shrink-0 text-muted transition group-open:rotate-180" aria-hidden />
                  </summary>
                  <ul className="border-t border-border bg-background/40">
                    {b.variants.map((v) => (
                      <li key={v.slug}>
                        <Link
                          href={href(lang, `/medicine/${v.slug}`)}
                          className="flex items-center justify-between gap-4 py-2.5 pr-11 pl-8 text-sm hover:bg-brand-soft/30 transition"
                        >
                          <span className="min-w-0">
                            <span className="font-medium">{v.strength ?? "—"}</span> <span className="text-muted">· {v.dosageForm}</span>
                          </span>
                          {v.unitPrice != null ? (
                            <span className="shrink-0 text-right">
                              <span className="font-medium">{formatPrice(lang, v.unitPrice)}</span>{" "}
                              <span className="text-xs text-muted">{priceBasis(v.priceLabel, t.perUnit)}</span>
                            </span>
                          ) : (
                            <span className="shrink-0 text-xs text-muted">{t.noPrice}</span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            )
          )}
        </ul>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-between gap-2 text-sm" aria-label="Pagination">
          <PageLink disabled={page <= 1} href={listHref(lang, query, { page: page - 1 })}>
            <ChevronLeft className="size-4" aria-hidden /> {t.prev}
          </PageLink>
          <span className="text-muted">{fill(t.pageOf, { p: formatNumber(lang, page), n: formatNumber(lang, pages) })}</span>
          <PageLink disabled={page >= pages} href={listHref(lang, query, { page: page + 1 })}>
            {t.next} <ChevronRight className="size-4" aria-hidden />
          </PageLink>
        </nav>
      )}
    </div>
  );
}
