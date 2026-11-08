"use client";

import { Suspense, useId, useState, type KeyboardEvent } from "react";
import { Loader2, Plus } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { formatNumber, formatPrice, priceBasis } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import { cn, fill } from "@/lib/utils";
import { useAutocompleteQuery } from "@/store/medicineApi";

export type MedicinePickerText = { addPlaceholder: string; addAria: string; clear: string; max: string; perUnit: string };
type Props = {
  lang: Locale;
  t: MedicinePickerText;
  /** Already chosen slugs (hidden from suggestions; count toward `max`). */
  selected: string[];
  max: number;
  onAdd: (slug: string) => void;
  onClear?: () => void;
};

const FRAME =
  "flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15 transition";

/** "Add a medicine" combobox (autocomplete). Used by the interaction checker and the cost calculator. */
// RTK Query reads Date.now() in render → interactive part inside Suspense (see CLAUDE.md).
export function MedicinePicker(props: Props) {
  return (
    <Suspense fallback={<Shell t={props.t} />}>
      <Picker {...props} />
    </Suspense>
  );
}

function Shell({ t }: { t: MedicinePickerText }) {
  return (
    <div className={FRAME}>
      <Plus className="ml-2 size-5 shrink-0 text-muted" aria-hidden />
      <input disabled placeholder={t.addPlaceholder} aria-label={t.addAria} className="h-11 w-full bg-transparent outline-none placeholder:text-muted" />
    </div>
  );
}

function Picker({ lang, t, selected, max, onAdd, onClear }: Props) {
  const listId = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const full = selected.length >= max;

  const term = useDebounce(q.trim(), 180);
  const { data = [], isFetching } = useAutocompleteQuery(term, { skip: term.length < 2 || full });
  const picked = new Set(selected);
  const suggestions = data.filter((d) => !picked.has(d.slug));
  const showList = open && term.length >= 2 && suggestions.length > 0;

  const add = (slug: string) => {
    setQ("");
    setOpen(false);
    setActive(-1);
    onAdd(slug);
  };

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
        {onClear && selected.length > 0 && (
          <button type="button" onClick={onClear} className="shrink-0 px-2 text-sm text-muted hover:text-foreground">
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
  );
}
