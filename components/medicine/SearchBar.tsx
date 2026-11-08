"use client";

import { Suspense, useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { useAutocompleteQuery } from "@/store/medicineApi";
import { formatPrice, priceBasis } from "@/lib/format";
import { cn } from "@/lib/utils";
import { href, type Locale } from "@/lib/i18n/config";

type Props = {
  lang: Locale;
  t: { placeholder: string; aria: string; submit: string; seeAll: string; noMatch: string; perUnit: string };
  defaultValue?: string;
  autoFocus?: boolean;
  className?: string;
};

const FRAME =
  "flex items-center gap-1 rounded-xl border border-border bg-card p-1 md:gap-2 md:rounded-2xl md:p-2 shadow-lg shadow-brand/5 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15 transition";
const INPUT =
  "h-9 w-full min-w-0 bg-transparent text-base md:h-12 md:text-lg outline-none placeholder:text-sm placeholder:text-muted md:placeholder:text-lg";
const BUTTON =
  "h-9 shrink-0 rounded-lg bg-brand px-3 text-sm font-semibold md:h-12 md:rounded-xl md:px-5 md:text-base text-white dark:text-slate-900 hover:opacity-90 transition";

// RTK Query hooks read Date.now() during render, which cacheComponents forbids in prerender.
// So the interactive bar renders inside Suspense; the prerendered fallback is a plain
// GET form with identical look (also works before JS loads).
export function SearchBar(props: Props) {
  return (
    <Suspense fallback={<StaticSearchForm {...props} />}>
      <InteractiveSearchBar {...props} />
    </Suspense>
  );
}

function StaticSearchForm({ lang, t, defaultValue, className }: Props) {
  return (
    <form action={href(lang, "/search")} role="search" className={cn("relative w-full", className)}>
      <div className={FRAME}>
        <Search className="ml-1 size-4 shrink-0 text-muted md:ml-2 md:size-5" aria-hidden />
        <input
          type="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          name="q"
          defaultValue={defaultValue}
          placeholder={t.placeholder}
          aria-label={t.aria}
          className={INPUT}
        />
        <button type="submit" className={BUTTON}>
          {t.submit}
        </button>
      </div>
    </form>
  );
}

function InteractiveSearchBar({ lang, t, defaultValue = "", autoFocus, className }: Props) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const term = useDebounce(q.trim(), 180);
  const { data: suggestions = [], isFetching, isSuccess } = useAutocompleteQuery(term, { skip: term.length < 2 });
  const showList = open && term.length >= 2 && suggestions.length > 0;
  const showEmpty = open && term.length >= 2 && isSuccess && !isFetching && suggestions.length === 0;

  const go = (query: string) => {
    if (!query.trim()) return;
    setOpen(false);
    router.push(href(lang, `/search?q=${encodeURIComponent(query.trim())}`));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (showList && active >= 0) router.push(href(lang, `/medicine/${suggestions[active].slug}`));
    else go(q);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <form onSubmit={onSubmit} role="search" className={cn("relative w-full", className)}>
      <div className={FRAME}>
        <Search className="ml-1 size-4 shrink-0 text-muted md:ml-2 md:size-5" aria-hidden />
        <input
          type="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          name="q"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          placeholder={t.placeholder}
          aria-label={t.aria}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showList}
          role="combobox"
          className={INPUT}
        />
        {isFetching && <Loader2 className="size-5 shrink-0 animate-spin text-muted" aria-hidden />}
        <button type="submit" className={BUTTON}>
          {t.submit}
        </button>
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 z-30 mt-2 max-h-[min(28rem,60vh)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-card text-left shadow-xl"
        >
          {suggestions.map((m, i) => (
            <li
              key={m.slug}
              role="option"
              aria-selected={i === active}
              onMouseDown={() => router.push(href(lang, `/medicine/${m.slug}`))}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left",
                i === active && "bg-brand-soft/60"
              )}
            >
              <span className="min-w-0">
                <span className="font-semibold">{m.brand}</span>{" "}
                <span className="text-sm text-muted">{[m.strength, m.dosageForm].filter(Boolean).join(" · ")}</span>
                <span className="block truncate text-sm text-muted">{m.genericName}</span>
              </span>
              {m.unitPrice != null && (
                <span className="shrink-0 text-right text-sm font-medium">
                  {formatPrice(lang, m.unitPrice)}
                  <span className="block text-xs font-normal text-muted">{priceBasis(m.priceLabel, t.perUnit)}</span>
                </span>
              )}
            </li>
          ))}
          <li
            role="option"
            aria-selected={false}
            onMouseDown={() => go(q)}
            className="cursor-pointer border-t border-border px-4 py-2.5 text-sm font-medium text-brand hover:bg-brand-soft/60"
          >
            {t.seeAll} “{q.trim()}” →
          </li>
        </ul>
      )}

      {showEmpty && (
        <p className="absolute z-20 mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-left text-sm text-muted shadow-xl">
          {t.noMatch}
        </p>
      )}
    </form>
  );
}
