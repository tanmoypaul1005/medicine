"use client";

import { Suspense, useId, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { formatNumber, formatPrice, priceBasis } from "@/lib/format";
import { href, type Locale } from "@/lib/i18n/config";
import { cn, fill } from "@/lib/utils";
import { useAutocompleteQuery } from "@/store/medicineApi";

export type PickedItem = { slug: string; brand: string; strength: string | null; dosageForm: string };
type T = {
  addPlaceholder: string;
  addAria: string;
  remove: string;
  clear: string;
  max: string;
  perUnit: string;
};
type Props = { lang: Locale; t: T; selected: PickedItem[]; max: number };

const FRAME =
  "flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15 transition";

// RTK Query reads Date.now() in render → interactive part inside Suspense (see CLAUDE.md).
export function InteractionPicker(props: Props) {
  return (
    <Suspense fallback={<Shell {...props} />}>
      <Picker {...props} />
    </Suspense>
  );
}

function Chips({ selected, onRemove, removeLabel }: { selected: PickedItem[]; onRemove?: (slug: string) => void; removeLabel: string }) {
  if (!selected.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {selected.map((m) => (
        <li key={m.slug} className="flex items-center gap-1 rounded-full border border-border bg-card py-1 pr-1 pl-3 text-sm">
          <span className="font-medium">{m.brand}</span>
          <span className="text-muted">{[m.strength, m.dosageForm].filter(Boolean).join(" · ")}</span>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(m.slug)}
              aria-label={`${removeLabel}: ${m.brand}`}
              className="ml-1 grid size-6 place-items-center rounded-full text-muted hover:bg-brand-soft hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function Shell({ t, selected }: Props) {
  return (
    <div className="space-y-3">
      <Chips selected={selected} removeLabel={t.remove} />
      <div className={FRAME}>
        <Plus className="ml-2 size-5 shrink-0 text-muted" aria-hidden />
        <input disabled placeholder={t.addPlaceholder} aria-label={t.addAria} className="h-11 w-full bg-transparent outline-none placeholder:text-muted" />
      </div>
    </div>
  );
}

function Picker({ lang, t, selected, max }: Props) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const full = selected.length >= max;

  const term = useDebounce(q.trim(), 250);
  const { data = [], isFetching } = useAutocompleteQuery(term, { skip: term.length < 2 || full });
  const picked = new Set(selected.map((s) => s.slug));
  const suggestions = data.filter((d) => !picked.has(d.slug));
  const showList = open && term.length >= 2 && suggestions.length > 0;

  const navigate = (slugs: string[]) => {
    setQ("");
    setOpen(false);
    setActive(-1);
    router.push(href(lang, slugs.length ? `/interactions?m=${slugs.join(",")}` : "/interactions"), { scroll: false });
  };
  const add = (slug: string) => navigate([...selected.map((s) => s.slug), slug]);
  const remove = (slug: string) => navigate(selected.map((s) => s.slug).filter((s) => s !== slug));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      add(suggestions[Math.max(active, 0)].slug);
    } else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className="space-y-3">
      <Chips selected={selected} onRemove={remove} removeLabel={t.remove} />

      <div className="relative">
        <div className={cn(FRAME, full && "opacity-60")}>
          <Plus className="ml-2 size-5 shrink-0 text-muted" aria-hidden />
          <input
            type="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={q}
            disabled={full}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={onKeyDown}
            placeholder={full ? fill(t.max, { n: formatNumber(lang, max) }) : t.addPlaceholder}
            aria-label={t.addAria}
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={showList}
            className="h-11 w-full min-w-0 bg-transparent outline-none placeholder:text-muted"
          />
          {isFetching && <Loader2 className="size-5 shrink-0 animate-spin text-muted" aria-hidden />}
          {selected.length > 0 && (
            <button type="button" onClick={() => navigate([])} className="shrink-0 px-2 text-sm text-muted hover:text-foreground">
              {t.clear}
            </button>
          )}
        </div>

        {showList && (
          <ul
            id={listId}
            role="listbox"
            className="absolute inset-x-0 z-30 mt-2 max-h-[min(24rem,60vh)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-card shadow-xl"
          >
            {suggestions.map((m, i) => (
              <li
                key={m.slug}
                role="option"
                aria-selected={i === active}
                onMouseDown={() => add(m.slug)}
                onMouseEnter={() => setActive(i)}
                className={cn("flex cursor-pointer items-center justify-between gap-3 px-4 py-3", i === active && "bg-brand-soft/60")}
              >
                <span className="min-w-0">
                  <span className="font-semibold">{m.brand}</span>{" "}
                  <span className="text-sm text-muted">{[m.strength, m.dosageForm].filter(Boolean).join(" · ")}</span>
                  <span className="block truncate text-sm text-muted">{m.genericName}</span>
                </span>
                {m.unitPrice != null && (
                  <span className="shrink-0 text-right text-sm text-muted">
                    {formatPrice(lang, m.unitPrice)}
                    <span className="block text-xs">{priceBasis(m.priceLabel, t.perUnit)}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
