import Link from "next/link";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { href, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import type { SearchResult } from "@/lib/search/types";
import { formatPrice } from "@/lib/format";
import { fill } from "@/lib/utils";
import { PageLink } from "./MedicineTable";

type T = Dictionary["searchPage"];
type Props = { lang: Locale; t: T; q: string; data: SearchResult };

const pageHref = (lang: Locale, q: string, page: number) =>
  href(lang, `/search?q=${encodeURIComponent(q)}${page > 1 ? `&page=${page}` : ""}`);

export function SearchResults({ lang, t, q, data }: Props) {
  const nf = new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en-US");
  const { hits, total, page, pages } = data;

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <SearchX className="mx-auto size-10 text-muted" aria-hidden />
        <p className="mt-3 font-semibold">{fill(t.empty, { q })}</p>
        <p className="mt-1 text-sm text-muted">{t.emptyHint}</p>
        <Link
          href={href(lang, "/medicines")}
          className="mt-5 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white dark:text-slate-900 hover:opacity-90 transition"
        >
          {t.browseAll}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{fill(t.total, { n: nf.format(total) })}</p>

      <ul className="grid gap-3 sm:grid-cols-2">
        {hits.map((m, i) => (
          <li key={`${m.slug}-${i}`}>
            <Link
              href={href(lang, `/medicine/${m.slug}`)}
              className="flex h-full items-start justify-between gap-4 rounded-xl border border-border bg-card p-4 hover:border-brand hover:shadow-md transition"
            >
              <div className="min-w-0">
                <p className="font-semibold">
                  {m.brand} <span className="font-normal text-muted">{m.strength}</span>
                  {m.type === "herbal" && (
                    <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 align-middle text-[10px] font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                      {t.herbal}
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted">{m.dosageForm}</p>
                {m.genericName && <p className="mt-2 truncate text-sm">{m.genericName}</p>}
                {m.manufacturerName && <p className="truncate text-xs text-muted">{m.manufacturerName}</p>}
              </div>
              <div className="shrink-0 text-right">
                {m.unitPrice != null ? (
                  <>
                    <p className="font-semibold">{formatPrice(lang, m.unitPrice)}</p>
                    <p className="text-xs text-muted">{t.perUnit}</p>
                  </>
                ) : (
                  <p className="text-xs text-muted">{t.noPrice}</p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <nav className="flex items-center justify-between gap-2 text-sm" aria-label="Pagination">
          <PageLink disabled={page <= 1} href={pageHref(lang, q, page - 1)}>
            <ChevronLeft className="size-4" aria-hidden /> {t.prev}
          </PageLink>
          <span className="text-muted">{fill(t.pageOf, { p: nf.format(page), n: nf.format(pages) })}</span>
          <PageLink disabled={page >= pages} href={pageHref(lang, q, page + 1)}>
            {t.next} <ChevronRight className="size-4" aria-hidden />
          </PageLink>
        </nav>
      )}
    </div>
  );
}

export function SearchResultsSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="h-4 w-40 animate-pulse rounded bg-border" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}
