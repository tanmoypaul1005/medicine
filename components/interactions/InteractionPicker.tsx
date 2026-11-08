"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { MedicinePicker, type MedicinePickerText } from "@/components/medicine/MedicinePicker";
import { href, type Locale } from "@/lib/i18n/config";

export type PickedItem = { slug: string; brand: string; strength: string | null; dosageForm: string };
type T = MedicinePickerText & { remove: string };
type Props = { lang: Locale; t: T; selected: PickedItem[]; max: number };

/** Chosen medicines (chips) + add box; state lives in the URL (?m=a,b). */
export function InteractionPicker({ lang, t, selected, max }: Props) {
  const router = useRouter();
  const slugs = selected.map((s) => s.slug);
  const navigate = (next: string[]) =>
    router.push(href(lang, next.length ? `/interactions?m=${next.join(",")}` : "/interactions"), { scroll: false });

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selected.map((m) => (
            <li key={m.slug} className="flex items-center gap-1 rounded-full border border-border bg-card py-1 pr-1 pl-3 text-sm">
              <span className="font-medium">{m.brand}</span>
              <span className="text-muted">{[m.strength, m.dosageForm].filter(Boolean).join(" · ")}</span>
              <button
                type="button"
                onClick={() => navigate(slugs.filter((s) => s !== m.slug))}
                aria-label={`${t.remove}: ${m.brand}`}
                className="ml-1 grid size-6 place-items-center rounded-full text-muted hover:bg-brand-soft hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <MedicinePicker lang={lang} t={t} selected={slugs} max={max} onAdd={(s) => navigate([...slugs, s])} onClear={() => navigate([])} />
    </div>
  );
}
