"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgePercent, Download, Minus, Plus, X } from "lucide-react";
import { MedicinePicker, type MedicinePickerText } from "@/components/medicine/MedicinePicker";
import { costParam, rowCost, type CostRow } from "@/lib/cost";
import { formatNumber, formatPrice, priceBasis } from "@/lib/format";
import { href, type Locale } from "@/lib/i18n/config";
import { fill } from "@/lib/utils";

export type CostText = MedicinePickerText & {
  remove: string;
  perDay: string;
  perMonthPack: string;
  less: string;
  more: string;
  monthly: string;
  monthlyQty: string;
  noPrice: string;
  cheaper: string;
  yearSave: string;
  noCheaper: string;
  totalNow: string;
  totalAlt: string;
  totalYearSave: string;
  perYear: string;
  partial: string;
  download: string;
  receiptTitle: string;
  receiptDate: string;
  receiptNote: string;
  colMedicine: string;
  colPrice: string;
  colQty: string;
  colAlt: string;
  total: string;
  disclaimer: string;
};

type Props = { lang: Locale; t: CostText; rows: CostRow[]; max: number; maxQty: number };

const PATH = "/cost-calculator";
const toNum = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const whole = (n: number) => Math.round(n);

/**
 * Rows come from the server (prices + cheapest alternative). Quantities are edited locally and mirrored
 * to the URL with history.replaceState (no server round-trip); adding/removing a medicine navigates.
 * Remounted by the page (key = slugs) whenever the medicine list changes.
 */
export function CostCalculator({ lang, t, rows, max, maxQty }: Props) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((r) => [r.slug, String(r.qty)])));

  const items = (q = qty) => rows.map((r) => ({ slug: r.slug, qty: toNum(q[r.slug] ?? "1") }));
  const url = (list: { slug: string; qty: number }[]) => href(lang, list.length ? `${PATH}?m=${costParam(list)}` : PATH);
  const navigate = (list: { slug: string; qty: number }[]) => router.replace(url(list), { scroll: false });

  const setOne = (slug: string, value: string) => {
    const next = { ...qty, [slug]: value };
    setQty(next);
    window.history.replaceState(null, "", url(items(next)));
  };
  const step = (row: CostRow, dir: 1 | -1) => {
    const s = row.priceLabel ? 1 : 0.5;
    const v = Math.min(Math.max(toNum(qty[row.slug] ?? "0") + dir * s, 0), maxQty);
    setOne(row.slug, String(Math.round(v * 100) / 100));
  };

  const qtyLabel = (row: CostRow) => (row.priceLabel ? fill(t.perMonthPack, { pack: row.priceLabel }) : t.perDay);
  const costs = rows.map((r) => ({ row: r, c: rowCost(r, toNum(qty[r.slug] ?? "0")) }));
  const priced = costs.filter((x) => x.c);
  const totalNow = priced.reduce((s, x) => s + x.c!.now, 0);
  const totalAlt = priced.reduce((s, x) => s + x.c!.alt, 0);
  const yearSave = (totalNow - totalAlt) * 12;

  // Date is set on click (not during render → no hydration mismatch); the browser's print dialog offers "Save as PDF".
  const [printedAt, setPrintedAt] = useState<{ date: string; url: string } | null>(null);
  const download = () => {
    setPrintedAt({
      date: new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
      url: window.location.href, // reopen the same calculation later
    });
    setTimeout(() => window.print(), 100);
  };

  return (
    <div className="space-y-6">
      <MedicinePicker
        lang={lang}
        t={t}
        selected={rows.map((r) => r.slug)}
        max={max}
        onAdd={(slug) => navigate([...items(), { slug, qty: 1 }])}
        onClear={() => navigate([])}
      />

      {rows.length > 0 && (
        <>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={download}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium transition hover:border-brand"
            >
              <Download className="size-4 text-brand" aria-hidden /> {t.download}
            </button>
          </div>

          {/* Summary */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label={t.totalNow} value={formatPrice(lang, whole(totalNow))} sub={fill(t.perYear, { amount: formatPrice(lang, whole(totalNow * 12)) })} />
            <Stat label={t.totalAlt} value={formatPrice(lang, whole(totalAlt))} sub={fill(t.perYear, { amount: formatPrice(lang, whole(totalAlt * 12)) })} />
            <div className="rounded-2xl bg-brand p-4 text-white dark:text-slate-900">
              <p className="text-sm opacity-90">{t.totalYearSave}</p>
              <p className="mt-1 text-2xl font-bold">{formatPrice(lang, whole(yearSave))}</p>
              {totalNow > 0 && (
                <p className="text-sm opacity-90">
                  {formatNumber(lang, Math.round(((totalNow - totalAlt) / totalNow) * 100))}%
                </p>
              )}
            </div>
          </div>
          {priced.length < rows.length && <p className="text-sm text-muted">{t.partial}</p>}

          <ul className="space-y-4">
            {costs.map(({ row, c }) => (
              <li key={row.slug} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={href(lang, `/medicine/${row.slug}`)} className="font-semibold hover:text-brand">
                      {row.brand} <span className="font-normal text-muted">{row.strength}</span>
                    </Link>
                    <p className="text-sm text-muted">{[row.dosageForm, row.manufacturerName].filter(Boolean).join(" · ")}</p>
                    <p className="mt-0.5 text-sm">
                      {row.unitPrice != null ? (
                        <>
                          {formatPrice(lang, row.unitPrice)} <span className="text-muted">{priceBasis(row.priceLabel, t.perUnit)}</span>
                        </>
                      ) : (
                        <span className="text-muted">{t.noPrice}</span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(items().filter((i) => i.slug !== row.slug))}
                    aria-label={`${t.remove}: ${row.brand}`}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-brand-soft hover:text-foreground"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>

                {row.unitPrice != null && (
                  <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                    <div className="text-sm">
                      <span className="mb-1 block text-muted">{qtyLabel(row)}</span>
                      <span className="inline-flex items-center rounded-xl border border-border">
                        <button type="button" onClick={() => step(row, -1)} aria-label={`${t.less}: ${row.brand}`} className="grid size-10 place-items-center text-muted hover:text-foreground">
                          <Minus className="size-4" aria-hidden />
                        </button>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={maxQty}
                          step={row.priceLabel ? 1 : 0.5}
                          value={qty[row.slug] ?? ""}
                          onChange={(e) => setOne(row.slug, e.target.value)}
                          aria-label={`${row.brand}: ${qtyLabel(row)}`}
                          className="h-10 w-16 bg-transparent text-center font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button type="button" onClick={() => step(row, 1)} aria-label={`${t.more}: ${row.brand}`} className="grid size-10 place-items-center text-muted hover:text-foreground">
                          <Plus className="size-4" aria-hidden />
                        </button>
                      </span>
                    </div>
                    {c && (
                      <p className="text-right">
                        <span className="block text-xs text-muted">
                          {t.monthly} · {fill(t.monthlyQty, { n: formatNumber(lang, c.n) })}
                        </span>
                        <span className="text-lg font-bold">{formatPrice(lang, whole(c.now))}</span>
                      </p>
                    )}
                  </div>
                )}

                {c && row.alt ? (
                  <Link
                    href={href(lang, `/medicine/${row.alt.slug}`)}
                    className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-300/60 bg-emerald-50 px-4 py-3 transition hover:border-emerald-400 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                        <BadgePercent className="size-3.5" aria-hidden /> {t.cheaper}
                      </span>
                      <span className="font-semibold">{row.alt.brand}</span>{" "}
                      <span className="text-sm text-muted">
                        {formatPrice(lang, row.alt.unitPrice)} {priceBasis(row.priceLabel, t.perUnit)}
                      </span>
                      {row.alt.manufacturerName && <span className="block truncate text-xs text-muted">{row.alt.manufacturerName}</span>}
                    </span>
                    <span className="shrink-0 text-right text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      {fill(t.yearSave, { amount: formatPrice(lang, whole(c.yearSave)) })}
                    </span>
                  </Link>
                ) : (
                  row.unitPrice != null && <p className="mt-3 text-sm text-muted">{t.noCheaper}</p>
                )}
              </li>
            ))}
          </ul>

          {/* Print-only summary, portaled to <body> so print CSS can display:none everything else
              (normal page flow → long lists continue onto page 2 instead of being cut off). */}
          {printedAt &&
            createPortal(
          <div id="cost-receipt" className="hidden bg-white p-8 text-black print:block">
            <h2 className="text-xl font-bold">MedicineMate — {t.receiptTitle}</h2>
            <p className="text-sm">{fill(t.receiptDate, { date: printedAt.date })}</p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded border border-gray-400 p-2">
                {t.totalNow}
                <b className="block text-lg">{formatPrice(lang, whole(totalNow))}</b>
                {fill(t.perYear, { amount: formatPrice(lang, whole(totalNow * 12)) })}
              </div>
              <div className="rounded border border-gray-400 p-2">
                {t.totalAlt}
                <b className="block text-lg">{formatPrice(lang, whole(totalAlt))}</b>
                {fill(t.perYear, { amount: formatPrice(lang, whole(totalAlt * 12)) })}
              </div>
              <div className="rounded border-2 border-black p-2">
                {t.totalYearSave}
                <b className="block text-lg">{formatPrice(lang, whole(yearSave))}</b>
                {totalNow > 0 && `${formatNumber(lang, Math.round(((totalNow - totalAlt) / totalNow) * 100))}%`}
              </div>
            </div>
            {priced.length < rows.length && <p className="mt-2 text-xs">{t.partial}</p>}
            <table className="mt-4 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-black text-left">
                  <th className="py-1 pr-2">{t.colMedicine}</th>
                  <th className="py-1 pr-2">{t.colPrice}</th>
                  <th className="py-1 pr-2">{t.colQty}</th>
                  <th className="py-1 pr-2 text-right">{t.monthly}</th>
                  <th className="py-1 pr-2">{t.colAlt}</th>
                  <th className="py-1 text-right">{t.totalYearSave}</th>
                </tr>
              </thead>
              <tbody>
                {costs.map(({ row, c }) => (
                  <tr key={row.slug} className="border-b border-gray-300 align-top">
                    <td className="py-1 pr-2">
                      <b>{row.brand}</b> {row.strength}
                      <br />
                      <span className="text-xs">{[row.dosageForm, row.manufacturerName].filter(Boolean).join(" · ")}</span>
                    </td>
                    <td className="py-1 pr-2">
                      {row.unitPrice != null ? `${formatPrice(lang, row.unitPrice)} ${priceBasis(row.priceLabel, t.perUnit)}` : t.noPrice}
                    </td>
                    <td className="py-1 pr-2">
                      {c ? (
                        <>
                          {formatNumber(lang, toNum(qty[row.slug] ?? "0"))} ({qtyLabel(row)})
                          <br />
                          <span className="text-xs">{fill(t.monthlyQty, { n: formatNumber(lang, c.n) })} / 30</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-1 pr-2 text-right">{c ? formatPrice(lang, whole(c.now)) : "—"}</td>
                    <td className="py-1 pr-2">
                      {c && row.alt ? (
                        <>
                          <b>{row.alt.brand}</b> — {formatPrice(lang, whole(c.alt))}
                          <br />
                          <span className="text-xs">
                            {formatPrice(lang, row.alt.unitPrice)} {priceBasis(row.priceLabel, t.perUnit)}
                            {row.alt.manufacturerName && ` · ${row.alt.manufacturerName}`}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs">{c ? t.noCheaper : "—"}</span>
                      )}
                    </td>
                    <td className="py-1 text-right">{c && row.alt ? formatPrice(lang, whole(c.yearSave)) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="mt-4 ml-auto text-sm">
              <tbody>
                <tr>
                  <td className="pr-4">{t.totalNow}</td>
                  <td className="text-right font-semibold">{formatPrice(lang, whole(totalNow))}</td>
                </tr>
                <tr>
                  <td className="pr-4">{t.totalAlt}</td>
                  <td className="text-right font-semibold">{formatPrice(lang, whole(totalAlt))}</td>
                </tr>
                <tr className="border-t border-black">
                  <td className="pr-4 font-bold">{t.totalYearSave}</td>
                  <td className="text-right font-bold">{formatPrice(lang, whole(yearSave))}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-6 text-xs">{t.receiptNote}</p>
            <p className="mt-1 text-xs">{t.disclaimer}</p>
            <p className="mt-1 break-all text-xs">{printedAt.url}</p>
          </div>,
              document.body
            )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted">{sub}</p>
    </div>
  );
}
