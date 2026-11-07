"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { href, type Locale } from "@/lib/i18n/config";
import { listHref } from "@/lib/medicineListUrl";
import { cn } from "@/lib/utils";
import { MEDICINE_SORTS, type MedicineListQuery } from "@/server/validators/medicine";

type T = {
  searchPlaceholder: string;
  reset: string;
  types: Record<"all" | "allopathic" | "herbal", string>;
  sorts: Record<(typeof MEDICINE_SORTS)[number], string>;
};

const FIELD = "h-10 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-brand";

/**
 * Filters apply automatically: dropdowns on change, search ~400ms after typing stops.
 * Rendered inside the page's <Suspense> (safe to use the router there). Still a GET form, so
 * Enter / no-JS submits normally.
 */
export function MedicineFilters({ lang, t, query }: { lang: Locale; t: T; query: MedicineListQuery }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(query.q);
  const term = useDebounce(q.trim(), 400);

  const go = (over: Partial<MedicineListQuery>) =>
    startTransition(() => router.replace(listHref(lang, query, { ...over, page: 1 }), { scroll: false }));

  // Debounced search: only navigate when the typed text differs from what's applied
  useEffect(() => {
    if (term !== query.q) go({ q: term });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only when the debounced term changes
  }, [term]);

  return (
    <form action={href(lang, "/medicines")} onSubmit={(e) => (e.preventDefault(), go({ q: q.trim() }))} className="flex flex-wrap items-center gap-2">
      {query.view !== "all" && <input type="hidden" name="view" value={query.view} />}
      <div className={cn(FIELD, "flex min-w-56 flex-1 items-center gap-2")}>
        <Search className="size-4 shrink-0 text-muted" aria-hidden />
        <input
          type="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchPlaceholder}
          className="h-full w-full bg-transparent outline-none placeholder:text-muted"
        />
        {pending && <Loader2 className="size-4 shrink-0 animate-spin text-muted" aria-hidden />}
      </div>
      <select
        name="type"
        value={query.type}
        onChange={(e) => go({ type: e.target.value as MedicineListQuery["type"] })}
        aria-label={t.types.all}
        className={FIELD}
      >
        {(["all", "allopathic", "herbal"] as const).map((v) => (
          <option key={v} value={v}>
            {t.types[v]}
          </option>
        ))}
      </select>
      <select
        name="sort"
        value={query.sort}
        onChange={(e) => go({ sort: e.target.value as MedicineListQuery["sort"] })}
        aria-label={t.sorts.brand}
        className={FIELD}
      >
        {MEDICINE_SORTS.map((v) => (
          <option key={v} value={v}>
            {t.sorts[v]}
          </option>
        ))}
      </select>
      <Link
        href={listHref(lang, { q: "", type: "all", sort: "brand", page: 1, view: query.view })}
        onClick={() => setQ("")}
        className="h-10 content-center px-2 text-sm text-muted hover:text-foreground"
      >
        {t.reset}
      </Link>
    </form>
  );
}
