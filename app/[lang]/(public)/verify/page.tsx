import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Search, ShieldCheck } from "lucide-react";
import { Disclaimer } from "@/components/medicine/Disclaimer";
import { DGDA_BROWSE } from "@/lib/dgda";
import { hasLocale, href, type Locale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/getDictionary";
import { pageMeta } from "@/lib/seo";
import { fill } from "@/lib/utils";
import { dgdaSyncedAt, searchDgda } from "@/server/services/dgda.service";
import { verifyQuery } from "@/server/validators/dgda";

type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: PageProps<"/[lang]/verify">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = getDictionary(lang).dgda;
  return pageMeta(lang, "/verify", { title: t.title, description: t.subtitle });
}

export default async function VerifyPage({ params, searchParams }: PageProps<"/[lang]/verify">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const t = dict.dgda;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <ShieldCheck className="size-6" aria-hidden />
        </span>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.title}</h1>
      </div>
      <p className="mt-2 text-muted">{t.subtitle}</p>

      <Disclaimer text={dict.disclaimer} className="mt-6" />

      <div className="mt-6">
        <Suspense fallback={<Form lang={lang} t={t} q="" />}>
          <Results lang={lang} t={t} searchParams={searchParams} />
        </Suspense>
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-card p-5 text-sm">
        <h2 className="font-semibold">{t.howTitle}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          <li>{t.how1}</li>
          <li>{t.how2}</li>
          <li>{t.how3}</li>
        </ul>
      </div>
      <p className="mt-6 text-xs text-muted">
        {t.method}{" "}
        <a href={DGDA_BROWSE} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
          tr.ocl.dghs.gov.bd
        </a>
      </p>
    </section>
  );
}

/** Plain GET form → works without JS; URL is shareable. */
function Form({ lang, t, q }: { lang: Locale; t: Dictionary["dgda"]; q: string }) {
  return (
    <form action={href(lang, "/verify")} role="search" className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15">
      <Search className="ml-2 size-5 shrink-0 text-muted" aria-hidden />
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder={t.placeholder}
        aria-label={t.placeholder}
        autoComplete="off"
        className="h-11 w-full min-w-0 bg-transparent outline-none placeholder:text-muted"
      />
      <button type="submit" className="shrink-0 rounded-xl bg-brand px-4 py-2.5 font-semibold text-white dark:text-slate-900">
        {t.submit}
      </button>
    </form>
  );
}

async function Results({ lang, t, searchParams }: { lang: Locale; t: Dictionary["dgda"]; searchParams: SP }) {
  const sp = await searchParams;
  const { q } = verifyQuery.parse({ q: Array.isArray(sp.q) ? sp.q[0] : sp.q });
  const [rows, syncedAt] = await Promise.all([q ? searchDgda(q) : [], dgdaSyncedAt()]); // "use cache"

  return (
    <div className="space-y-4">
      <Form lang={lang} t={t} q={q} />
      {!syncedAt && <p className="text-muted">{t.noData}</p>}
      {syncedAt && q && (
        <>
          <p className="text-sm text-muted">{rows.length ? fill(t.found, { n: String(rows.length), q }) : fill(t.none, { q })}</p>
          {rows.length > 0 && (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {rows.map((r, i) => (
                <li key={`${r.darNumber}-${r.tradeName}-${i}`} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{r.tradeName}</p>
                    <p className="text-sm text-muted">{[r.genericContent, r.dosageForm].filter(Boolean).join(" · ")}</p>
                    {r.company && <p className="text-xs text-muted">{r.company}</p>}
                  </div>
                  {r.darNumber && <span className="shrink-0 rounded-lg bg-brand-soft px-2 py-1 font-mono text-xs text-brand">DAR {r.darNumber}</span>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {syncedAt && <p className="text-xs text-muted">{fill(t.source, { date: syncedAt.slice(0, 10) })}</p>}
    </div>
  );
}
