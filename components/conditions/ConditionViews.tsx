import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Brain,
  Bug,
  Bus,
  CalendarDays,
  ChevronRight,
  CircleDot,
  Droplets,
  Flame,
  Flower2,
  Hourglass,
  MessageCircle,
  MessagesSquare,
  Pill,
  Scan,
  Smile,
  Sparkles,
  Thermometer,
  Wind,
  Worm,
  type LucideIcon,
} from "lucide-react";
import { formatNumber, formatPrice } from "@/lib/format";
import { href, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import { cn, fill } from "@/lib/utils";
import type { ConditionCard, ConditionDetail } from "@/server/services/condition.service";

type T = Dictionary["conditions"];

const ICONS: Record<string, LucideIcon> = {
  thermometer: Thermometer,
  brain: Brain,
  activity: Activity,
  smile: Smile,
  calendar: CalendarDays,
  wind: Wind,
  messages: MessagesSquare,
  flower: Flower2,
  flame: Flame,
  circle: CircleDot,
  droplets: Droplets,
  hourglass: Hourglass,
  bus: Bus,
  "message-circle": MessageCircle,
  scan: Scan,
  bug: Bug,
  sparkles: Sparkles,
  worm: Worm,
};

export function ConditionIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICONS[icon] ?? Pill;
  return <Icon className={className} aria-hidden />;
}

export const conditionName = (lang: Locale, c: { nameBn: string; nameEn: string }) => (lang === "bn" ? c.nameBn : c.nameEn);

function ChipList({ lang, items, className }: { lang: Locale; items: ConditionCard[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {items.map((c) => (
        <li key={c.slug}>
          <Link
            href={href(lang, `/condition/${c.slug}`)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium hover:border-brand transition"
          >
            <ConditionIcon icon={c.icon} className="size-4 text-brand" />
            {conditionName(lang, c)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Compact chips (home page, search page). With `initial`, only the first N show and the rest
 * open in place via a native <details> "see more" (no client JS).
 */
export function ConditionChips({
  lang,
  items,
  className,
  initial,
  more,
}: {
  lang: Locale;
  items: ConditionCard[];
  className?: string;
  initial?: number;
  more?: { show: string; hide: string };
}) {
  if (!initial || !more || items.length <= initial) return <ChipList lang={lang} items={items} className={className} />;
  const rest = items.slice(initial);
  return (
    <div className={className}>
      <ChipList lang={lang} items={items.slice(0, initial)} />
      {/* Remaining chips open in place; summary text flips between "show N more" / "show less" */}
      <details className="group mt-3">
        <summary className="w-fit cursor-pointer list-none text-sm font-medium text-brand hover:underline [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">{fill(more.show, { n: formatNumber(lang, rest.length) })} ▾</span>
          <span className="hidden group-open:inline">{more.hide} ▴</span>
        </summary>
        <ChipList lang={lang} items={rest} className="mt-3" />
      </details>
    </div>
  );
}

/** Card grid (conditions list page). */
export function ConditionGrid({ lang, t, items }: { lang: Locale; t: T; items: ConditionCard[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => (
        <li key={c.slug}>
          <Link
            href={href(lang, `/condition/${c.slug}`)}
            className="flex h-full gap-4 rounded-2xl border border-border bg-card p-5 hover:border-brand hover:shadow-md transition"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
              <ConditionIcon icon={c.icon} className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">{conditionName(lang, c)}</span>
              <span className="mt-1 line-clamp-2 block text-sm text-muted">{lang === "bn" ? c.summaryBn : c.summaryEn}</span>
              <span className="mt-2 block text-xs font-medium text-brand">{fill(t.medsCount, { n: formatNumber(lang, c.genericCount) })}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function RedFlags({ t, items }: { t: T; items: string[] }) {
  if (!items.length) return null;
  return (
    <section className="rounded-2xl border border-red-300/70 bg-red-50 p-5 dark:border-red-500/40 dark:bg-red-500/10">
      <h2 className="flex items-center gap-2 font-semibold text-red-800 dark:text-red-300">
        <AlertTriangle className="size-5" aria-hidden /> {t.seeDoctor}
      </h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-red-900 dark:text-red-200">
        {items.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    </section>
  );
}

export function ConditionMedicines({ lang, t, c }: { lang: Locale; t: T; c: ConditionDetail }) {
  return (
    <section>
      <h2 className="text-xl font-semibold">{t.commonMeds}</h2>
      <p className="mt-1 text-sm text-muted">{t.commonMedsSub}</p>

      <div className="mt-5 space-y-4">
        {c.generics.map((g) => (
          <article key={g.slug} className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold">{g.name}</h3>

            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border">
              {g.brands.map((b) => (
                <li key={b.slug}>
                  <Link
                    href={href(lang, `/medicine/${b.slug}`)}
                    className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm hover:bg-brand-soft/30 transition"
                  >
                    <span className="min-w-0">
                      <span className="font-medium">{b.brand}</span>{" "}
                      <span className="text-muted">{[b.strength, b.dosageForm].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 font-medium">
                      {formatPrice(lang, b.unitPrice)}
                      <ChevronRight className="size-4 text-muted" aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {g.brandTotal > g.brands.length && (
              <Link
                href={href(lang, `/search?q=${encodeURIComponent(g.name)}`)}
                className="mt-2 inline-block text-sm font-medium text-brand hover:underline"
              >
                {fill(t.allBrands, { n: formatNumber(lang, g.brandTotal) })}
              </Link>
            )}

            <details className="group mt-3">
              <summary className="cursor-pointer list-none text-xs font-medium text-muted hover:text-foreground">
                {t.labelSays} ▾
              </summary>
              <blockquote className="mt-2 border-l-2 border-border pl-3 text-sm italic text-muted">{g.evidence}</blockquote>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}
