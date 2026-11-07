import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { href, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import { formatPrice, priceBasis } from "@/lib/format";
import { listHref } from "@/lib/medicineListUrl";
import { cn, fill } from "@/lib/utils";
import type { MedicineList } from "@/server/services/medicine.service";
import { MEDICINE_VIEWS, type MedicineListQuery } from "@/server/validators/medicine";

type T = Dictionary["medicines"];
type Props = { lang: Locale; t: T; query: MedicineListQuery; data: MedicineList };

const pageHref = (lang: Locale, query: MedicineListQuery, page: number) => listHref(lang, query, { page });

/** "All medicines | By brand" segmented toggle (plain links → works without JS, keeps filters). */
export function ViewToggle({ lang, t, query }: Omit<Props, "data">) {
  return (
    <nav aria-label={t.viewAria} className="inline-flex rounded-xl border border-border bg-card p-1 text-sm">
      {MEDICINE_VIEWS.map((v) => (
        <Link
          key={v}
          href={listHref(lang, query, { view: v, page: 1 })}
          aria-current={query.view === v ? "page" : undefined}
          className={cn(
            "rounded-lg px-4 py-1.5 font-medium transition",
            query.view === v ? "bg-brand text-white dark:text-slate-900" : "text-muted hover:text-foreground"
          )}
        >
          {t.views[v]}
        </Link>
      ))}
    </nav>
  );
}

export function MedicineTable({ lang, t, query, data }: Props) {
  const nf = new Intl.NumberFormat("en-US");
  const { rows, total, page, pages } = data;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{fill(t.total, { n: nf.format(total) })}</p>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-8 text-center text-muted">{t.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-160 text-left text-sm">
            <thead className="border-b border-border bg-brand-soft/40 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">{t.cols.brand}</th>
                <th className="px-4 py-3 font-semibold">{t.cols.strength}</th>
                <th className="px-4 py-3 font-semibold">{t.cols.form}</th>
                <th className="px-4 py-3 font-semibold">{t.cols.generic}</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">{t.cols.manufacturer}</th>
                <th className="px-4 py-3 text-right font-semibold">{t.cols.price}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-brand-soft/30 transition">
                  <td className="px-4 py-3">
                    <Link href={href(lang, `/medicine/${m.slug}`)} className="font-semibold hover:text-brand">
                      {m.brand}
                    </Link>
                    {m.type === "herbal" && (
                      <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                        {t.herbal}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{m.strength ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{m.dosageForm}</td>
                  <td className="max-w-56 truncate px-4 py-3" title={m.genericName ?? undefined}>
                    {m.genericName ?? "—"}
                  </td>
                  <td className="hidden max-w-48 truncate px-4 py-3 text-muted md:table-cell" title={m.manufacturerName ?? undefined}>
                    {m.manufacturerName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                    {m.unitPrice != null ? (
                      <>
                        {formatPrice(lang, m.unitPrice)}
                        <span className="block text-xs font-normal text-muted">{priceBasis(m.priceLabel, t.perUnit)}</span>
                      </>
                    ) : (
                      t.noPrice
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-between gap-2 text-sm" aria-label="Pagination">
          <PageLink disabled={page <= 1} href={pageHref(lang, query, page - 1)}>
            <ChevronLeft className="size-4" aria-hidden /> {t.prev}
          </PageLink>
          <span className="text-muted">{fill(t.pageOf, { p: nf.format(page), n: nf.format(pages) })}</span>
          <PageLink disabled={page >= pages} href={pageHref(lang, query, page + 1)}>
            {t.next} <ChevronRight className="size-4" aria-hidden />
          </PageLink>
        </nav>
      )}
    </div>
  );
}

export function PageLink({ href: to, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  const cls = "inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 font-medium";
  return disabled ? (
    <span className={cn(cls, "opacity-40")} aria-disabled>
      {children}
    </span>
  ) : (
    <Link href={to} className={cn(cls, "hover:border-brand transition")}>
      {children}
    </Link>
  );
}

export function MedicineTableSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="h-4 w-32 animate-pulse rounded bg-border" />
      <div className="space-y-px overflow-hidden rounded-xl border border-border bg-card">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="h-11 animate-pulse bg-border/30" />
        ))}
      </div>
    </div>
  );
}
