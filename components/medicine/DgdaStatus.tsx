import Link from "next/link";
import { SearchCheck, ShieldCheck } from "lucide-react";
import { href, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import { fill } from "@/lib/utils";
import { getDgdaStatus } from "@/server/services/dgda.service";

type Props = {
  lang: Locale;
  t: Dictionary["dgda"];
  m: { brand: string; manufacturerName: string | null; strength: string | null; dosageForm: string };
};

/** Medicine page: DGDA registration status. Never says "genuine"/"fake" (see dgda.service.ts). */
export async function DgdaStatus({ lang, t, m }: Props) {
  const s = await getDgdaStatus(m); // "use cache" (tag dgda)
  if (s.status === "noData") return null;
  const date = s.syncedAt.slice(0, 10);

  if (s.status === "registered") {
    const e = s.entry;
    return (
      <div className="rounded-2xl border border-emerald-300/60 bg-emerald-50 p-4 text-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <p className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="size-5" aria-hidden /> {t.registered}
          {e.darNumber && <span className="font-mono font-medium">· DAR {e.darNumber}</span>}
        </p>
        <p className="mt-1 text-muted">{[e.tradeName, e.genericContent, e.dosageForm, e.company].filter(Boolean).join(" · ")}</p>
        {!s.exactStrength && <p className="mt-1 text-muted">{t.otherStrength}</p>}
        <p className="mt-2 text-xs text-muted">
          {t.notProof} {fill(t.source, { date })}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold">
        <SearchCheck className="size-5 text-muted" aria-hidden /> {t.notFound}
      </p>
      <p className="mt-1 text-muted">{t.notFoundHelp}</p>
      <Link href={href(lang, `/verify?q=${encodeURIComponent(m.brand)}`)} className="mt-2 inline-block font-medium text-brand hover:underline">
        {t.checkLink}
      </Link>
      <p className="mt-2 text-xs text-muted">{fill(t.source, { date })}</p>
    </div>
  );
}
