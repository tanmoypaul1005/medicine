import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { GitCompareArrows } from "lucide-react";
import { InteractionPicker } from "@/components/interactions/InteractionPicker";
import { InteractionResults } from "@/components/interactions/InteractionResults";
import { Disclaimer } from "@/components/medicine/Disclaimer";
import { hasLocale, href, type Locale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/getDictionary";
import { checkInteractions } from "@/server/services/interaction.service";
import { interactionQuery, MAX_CHECK_ITEMS } from "@/server/validators/interaction";

type SP = Promise<Record<string, string | string[] | undefined>>;

// Verified example pairs (one per result type)
const EXAMPLES = [
  { label: "Napa + Ace", m: "napa-500-mg-tablet,ace-500-mg-tablet" },
  { label: "Adecin + Antacid", m: "adecin-500-mg-tablet,antacid-250-mg-400-mg-chewable-tablet" },
  { label: "Farin + Seclo", m: "farin-5-mg-tablet,seclo-20-mg-capsule-delayed-release" },
];

export async function generateMetadata({ params }: PageProps<"/[lang]/interactions">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = getDictionary(lang).interactions;
  return { title: t.title, description: t.subtitle };
}

export default async function InteractionsPage({ params, searchParams }: PageProps<"/[lang]/interactions">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const t = dict.interactions;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <GitCompareArrows className="size-6" aria-hidden />
        </span>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.title}</h1>
      </div>
      <p className="mt-2 text-muted">{t.subtitle}</p>

      <Disclaimer text={dict.disclaimer} className="mt-6" />

      <div className="mt-6">
        <Suspense fallback={<div className="h-14 animate-pulse rounded-2xl border border-border bg-card" />}>
          <Checker lang={lang} t={t} searchParams={searchParams} />
        </Suspense>
      </div>

      <p className="mt-10 text-xs text-muted">{t.method}</p>
    </section>
  );
}

async function Checker({ lang, t, searchParams }: { lang: Locale; t: Dictionary["interactions"]; searchParams: SP }) {
  const sp = await searchParams;
  const { m } = interactionQuery.parse({ m: Array.isArray(sp.m) ? sp.m[0] : sp.m });
  await connection(); // Mongoose uses new Date() internally → request-time only
  const result = m.length ? await checkInteractions(m) : null;
  const selected = (result?.items ?? []).map(({ slug, brand, strength, dosageForm }) => ({ slug, brand, strength, dosageForm }));

  return (
    <div className="space-y-8">
      <InteractionPicker
        lang={lang}
        t={{ addPlaceholder: t.addPlaceholder, addAria: t.addAria, remove: t.remove, clear: t.clear, max: t.max, perUnit: t.perUnit }}
        selected={selected}
        max={MAX_CHECK_ITEMS}
      />

      {result && result.items.length >= 2 ? (
        <InteractionResults lang={lang} t={t} result={result} />
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center">
          <p className="text-muted">{t.needTwo}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="text-muted">{t.examples}</span>
            {EXAMPLES.map((e) => (
              <Link
                key={e.m}
                href={href(lang, `/interactions?m=${e.m}`)}
                className="rounded-full border border-border bg-card px-3 py-1 hover:border-brand transition"
              >
                {e.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
