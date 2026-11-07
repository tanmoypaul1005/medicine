import Link from "next/link";
import { AlertTriangle, BadgePercent, ChevronDown, ExternalLink, Factory, FlaskConical, Info, Pill } from "lucide-react";
import { href, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import { formatNumber, formatPrice } from "@/lib/format";
import { cn, fill } from "@/lib/utils";
import type { GenericSection } from "@/models/Generic";
import type { MedicineDetail } from "@/server/services/medicineDetail.service";

type T = Dictionary["medicine"];
type Props = { lang: Locale; t: T; m: MedicineDetail };

const WARNING_SECTIONS: GenericSection[] = ["contraindications", "precautions", "sideEffects", "pregnancyLactation", "interaction"];
const INFO_SECTIONS: GenericSection[] = [
  "indication",
  "dosage",
  "administration",
  "pediatric",
  "overdose",
  "pharmacology",
  "therapeuticClass",
  "duration",
  "reconstitution",
  "storage",
];

const money = (lang: Locale) => (n: number) => formatPrice(lang, n);

export function MedicineHeader({ lang, t, m }: Props) {
  const fmt = money(lang);
  const genericName = m.generic?.name ?? m.genericNameRaw;
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_auto]">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">{m.dosageForm}</span>
          {m.type === "herbal" && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
              {t.herbal}
            </span>
          )}
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          {m.brand} {m.strength && <span className="font-semibold text-muted">{m.strength}</span>}
        </h1>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          {genericName && (
            <Fact icon={FlaskConical} label={t.generic}>
              <Link href={href(lang, `/search?q=${encodeURIComponent(genericName)}`)} className="font-medium hover:text-brand">
                {genericName}
              </Link>
            </Fact>
          )}
          {m.manufacturerName && (
            <Fact icon={Factory} label={t.manufacturer}>
              {m.manufacturerName}
            </Fact>
          )}
          {m.generic?.drugClass && (
            <Fact icon={Pill} label={t.drugClass}>
              {m.generic.drugClass}
            </Fact>
          )}
          {m.generic?.pregnancyCategory && (
            <Fact icon={AlertTriangle} label={t.pregnancy}>
              {m.generic.pregnancyCategory}
            </Fact>
          )}
        </dl>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 md:min-w-64">
        <p className="text-sm text-muted">{t.price}</p>
        {m.unitPrice != null ? (
          <p className="mt-1 text-3xl font-bold">
            {fmt(m.unitPrice)}{" "}
            <span className="text-sm font-normal text-muted">
              {m.priceLabel ? `${t.per} ${m.priceLabel}` : t.perUnit}
            </span>
          </p>
        ) : (
          <p className="mt-1 font-semibold text-muted">{t.noPrice}</p>
        )}
        {m.packs.length > 0 && (
          <>
            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted">{t.packs}</p>
            <ul className="mt-2 space-y-1 text-sm">
              {m.packs.map((p, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span className="text-muted">
                    {p.qty ? fill(t.pack, { n: formatNumber(lang, p.qty) }) : p.label === "unit" ? t.perUnit : p.label}
                  </span>
                  <span className="font-medium">{fmt(p.qtyPrice ?? p.price)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, children }: { icon: typeof Pill; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd>{children}</dd>
      </div>
    </div>
  );
}

export function Alternatives({ lang, t, m }: Props) {
  const fmt = money(lang);
  const pct = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }); // same digits as the price beside it
  const nf = new Intl.NumberFormat("en-US");
  const anyPack = m.priceLabel != null || m.alternatives.some((a) => a.priceLabel != null);

  return (
    <section>
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <BadgePercent className="size-5 text-brand" aria-hidden /> {t.alternatives}
      </h2>
      <p className="mt-1 text-sm text-muted">{t.alternativesSub}</p>

      {m.alternatives.length === 0 ? (
        <p className="mt-4 rounded-xl border border-border bg-card p-6 text-center text-sm text-muted">{t.noAlternatives}</p>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {m.alternatives.map((a, i) => {
              const comparable = m.unitPrice != null && a.priceLabel === m.priceLabel;
              const diff = comparable ? (m.unitPrice as number) - a.unitPrice : 0;
              return (
                <li key={a.slug}>
                  <Link
                    href={href(lang, `/medicine/${a.slug}`)}
                    className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-brand-soft/30 transition"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {a.brand}
                        {i === 0 && diff > 0 && (
                          <span className="ml-2 rounded bg-brand px-1.5 py-0.5 align-middle text-[10px] font-semibold text-white dark:text-slate-900">
                            {t.cheapest}
                          </span>
                        )}
                      </p>
                      {a.manufacturerName && <p className="truncate text-xs text-muted">{a.manufacturerName}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold">
                        {fmt(a.unitPrice)}
                        {a.priceLabel && <span className="text-xs font-normal text-muted"> / {a.priceLabel}</span>}
                      </p>
                      {comparable && (
                        <p
                          className={cn(
                            "text-xs font-medium",
                            diff > 0 ? "text-emerald-600 dark:text-emerald-400" : diff < 0 ? "text-muted" : "text-muted"
                          )}
                        >
                          {diff > 0
                            ? fill(t.save, { amount: fmt(diff), pct: pct.format((diff / (m.unitPrice as number)) * 100) })
                            : diff < 0
                              ? fill(t.pricier, { amount: fmt(-diff) })
                              : t.same}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          {m.alternativesTotal > m.alternatives.length && (
            <p className="mt-2 text-xs text-muted">
              {fill(t.alternativesCount, { n: nf.format(m.alternativesTotal), shown: nf.format(m.alternatives.length) })}
            </p>
          )}
          {anyPack && <p className="mt-2 text-xs text-muted">{t.packNote}</p>}
        </>
      )}
    </section>
  );
}

export function Variants({ lang, t, m }: Props) {
  if (!m.variants.length) return null;
  return (
    <section>
      <h2 className="text-lg font-semibold">{fill(t.variants, { brand: m.brand })}</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {m.variants.map((v) => (
          <li key={v.slug}>
            <Link
              href={href(lang, `/medicine/${v.slug}`)}
              className="block rounded-lg border border-border bg-card px-3 py-2 text-sm hover:border-brand transition"
            >
              <span className="font-medium">{v.strength ?? "—"}</span> <span className="text-muted">· {v.dosageForm}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function GenericInfo({ t, m }: Omit<Props, "lang">) {
  const s = m.generic?.sections ?? {};
  const warnings = WARNING_SECTIONS.filter((k) => s[k]);
  const info = INFO_SECTIONS.filter((k) => s[k]);

  if (!warnings.length && !info.length) {
    return <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted">{t.noInfo}</p>;
  }

  return (
    <div className="space-y-8">
      {warnings.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <AlertTriangle className="size-5 text-amber-500" aria-hidden /> {t.warnings}
          </h2>
          <div className="mt-4 space-y-2">
            {warnings.map((k) => (
              <Section key={k} title={t.sections[k]} html={s[k]!} tone="warn" />
            ))}
          </div>
        </section>
      )}
      {info.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Info className="size-5 text-brand" aria-hidden /> {t.details}
          </h2>
          <div className="mt-4 space-y-2">
            {info.map((k, i) => (
              <Section key={k} title={t.sections[k]} html={s[k]!} open={i === 0} />
            ))}
          </div>
        </section>
      )}
      {m.generic && (
        <p className="text-xs text-muted">
          {t.source}: medex.com.bd
          {m.generic.monographUrl && (
            <>
              {" · "}
              <a href={m.generic.monographUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 hover:text-brand">
                {t.sourceMonograph} <ExternalLink className="size-3" aria-hidden />
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}

function Section({ title, html, open, tone }: { title: string; html: string; open?: boolean; tone?: "warn" }) {
  return (
    <details
      open={open}
      className={cn(
        "group rounded-xl border bg-card",
        tone === "warn" ? "border-amber-300/60 dark:border-amber-500/30" : "border-border"
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-medium">
        {title}
        <ChevronDown className="size-4 shrink-0 text-muted transition group-open:rotate-180" aria-hidden />
      </summary>
      {/* HTML sanitized to an allowlist at import (scripts/import/lib/transform.ts → cleanHtml) */}
      <div className="med-html border-t border-border px-4 py-3 text-sm" dangerouslySetInnerHTML={{ __html: html }} />
    </details>
  );
}
