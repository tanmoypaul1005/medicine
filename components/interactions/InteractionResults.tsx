import Link from "next/link";
import { AlertOctagon, AlertTriangle, CircleHelp, Copy } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { href, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import { cn, fill } from "@/lib/utils";
import type { CheckItem, CheckResult, PairResult } from "@/server/services/interaction.service";

type T = Dictionary["interactions"];
type Props = { lang: Locale; t: T; result: CheckResult };

const STYLE: Record<PairResult["level"], { icon: typeof AlertOctagon; box: string; badge: string }> = {
  duplicate: {
    icon: Copy,
    box: "border-red-300/70 dark:border-red-500/40",
    badge: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  },
  warning: {
    icon: AlertOctagon,
    box: "border-red-300/70 dark:border-red-500/40",
    badge: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  },
  caution: {
    icon: AlertTriangle,
    box: "border-amber-300/70 dark:border-amber-500/40",
    badge: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200",
  },
  none: { icon: CircleHelp, box: "border-border", badge: "bg-border/60 text-muted" },
};

const name = (m: CheckItem) => [m.brand, m.strength].filter(Boolean).join(" ");

export function InteractionResults({ lang, t, result }: Props) {
  const flagged = result.pairs.filter((p) => p.level !== "none");
  const unknown = result.pairs.filter((p) => p.level === "none");
  const noIngredients = result.items.filter((i) => i.ingredients.length === 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">
          {fill(t.summary, { n: formatNumber(lang, result.items.length), pairs: formatNumber(lang, result.pairs.length) })}
        </span>
        {(["duplicate", "warning", "caution", "none"] as const).map((lvl) =>
          result.counts[lvl] ? (
            <span key={lvl} className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STYLE[lvl].badge)}>
              {t.levels[lvl]}: {formatNumber(lang, result.counts[lvl])}
            </span>
          ) : null
        )}
      </div>

      {result.missing.length > 0 && <p className="text-sm text-muted">{t.missing}</p>}
      {noIngredients.map((i) => (
        <p key={i.slug} className="text-sm text-muted">
          {fill(t.unknownIngredients, { brand: i.brand })}
        </p>
      ))}

      {flagged.map((p) => (
        <PairCard key={`${p.a.slug}|${p.b.slug}`} lang={lang} t={t} p={p} />
      ))}

      {unknown.length > 0 && (
        <section className={cn("rounded-2xl border bg-card p-5", STYLE.none.box)}>
          <h3 className="flex items-center gap-2 font-semibold">
            <CircleHelp className="size-5 text-muted" aria-hidden /> {t.levels.none}
          </h3>
          <p className="mt-1 text-sm text-muted">{t.levelHelp.none}</p>
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            {unknown.map((p) => (
              <li key={`${p.a.slug}|${p.b.slug}`} className="rounded-lg border border-border px-3 py-1.5">
                {p.a.brand} + {p.b.brand}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PairCard({ lang, t, p }: { lang: Locale; t: T; p: PairResult }) {
  const s = STYLE[p.level];
  const Icon = s.icon;
  const dup = p.findings.find((f) => f.kind === "duplicate");

  return (
    <section className={cn("rounded-2xl border bg-card p-5", s.box)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 font-semibold">
          <Icon className="size-5 shrink-0" aria-hidden />
          <Link href={href(lang, `/medicine/${p.a.slug}`)} className="hover:text-brand">
            {name(p.a)}
          </Link>
          <span className="text-muted">+</span>
          <Link href={href(lang, `/medicine/${p.b.slug}`)} className="hover:text-brand">
            {name(p.b)}
          </Link>
        </h3>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", s.badge)}>{t.levels[p.level]}</span>
      </div>
      <p className="mt-2 text-sm text-muted">
        {p.level === "duplicate" ? fill(t.levelHelp.duplicate, { ing: dup?.a ?? "" }) : t.levelHelp[p.level as "warning" | "caution"]}
      </p>

      {p.findings
        .filter((f) => f.kind !== "duplicate")
        .map((f) => (
          <div key={`${f.a}|${f.b}`} className="mt-4">
            <p className="text-sm font-medium">
              {f.a} ↔ {f.b}{" "}
              <span className={cn("ml-1 rounded px-1.5 py-0.5 text-[10px] font-semibold", STYLE[f.kind].badge)}>{t.levels[f.kind]}</span>
            </p>
            <ul className="mt-2 space-y-2">
              {f.evidence.map((e, i) => (
                <li key={i} className="border-l-2 border-border pl-3 text-sm">
                  <q className="italic">{e.text}</q>
                  <span className="mt-0.5 block text-xs text-muted">
                    {fill(t.fromLabel, { generic: e.genericName })}
                    {e.via && <> · {fill(t.viaClass, { cls: e.via, ing: e.genericName.toLowerCase().includes(f.a.toLowerCase()) ? f.b : f.a })}</>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </section>
  );
}
