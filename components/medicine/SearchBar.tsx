"use client";

import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { useAutocompleteQuery } from "@/store/medicineApi";
import { cn } from "@/lib/utils";

type Props = { autoFocus?: boolean; className?: string };

export function SearchBar({ autoFocus, className }: Props) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const term = useDebounce(q.trim(), 250);
  const { data: suggestions = [], isFetching } = useAutocompleteQuery(term, { skip: term.length < 2 });
  const showList = open && term.length >= 2 && suggestions.length > 0;

  const go = (query: string) => {
    if (!query.trim()) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (showList && active >= 0) router.push(`/medicine/${suggestions[active].slug}`);
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
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-lg shadow-brand/5 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15 transition">
        <Search className="ml-2 size-5 shrink-0 text-muted" aria-hidden />
        <input
          type="search"
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
          placeholder="ওষুধের নাম লিখুন — Napa, Paracetamol, নাপা…"
          aria-label="Search medicine"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showList}
          role="combobox"
          className="h-12 w-full min-w-0 bg-transparent text-base sm:text-lg outline-none placeholder:text-muted"
        />
        {isFetching && <Loader2 className="size-5 shrink-0 animate-spin text-muted" aria-hidden />}
        <button
          type="submit"
          className="h-12 shrink-0 rounded-xl bg-brand px-5 font-semibold text-white dark:text-slate-900 hover:opacity-90 transition"
        >
          খুঁজুন
        </button>
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-xl"
        >
          {suggestions.map((m, i) => (
            <li
              key={m.slug}
              role="option"
              aria-selected={i === active}
              onMouseDown={() => router.push(`/medicine/${m.slug}`)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left",
                i === active && "bg-brand-soft/60"
              )}
            >
              <span className="min-w-0">
                <span className="font-semibold">{m.brand}</span>{" "}
                <span className="text-sm text-muted">{m.strength}</span>
                <span className="block truncate text-sm text-muted">{m.genericName}</span>
              </span>
              {m.unitPrice != null && <span className="shrink-0 text-sm font-medium">৳{m.unitPrice}</span>}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
