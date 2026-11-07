import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Disclaimer } from "@/components/medicine/Disclaimer";
import { SearchBar } from "@/components/medicine/SearchBar";
import { SearchResults, SearchResultsSkeleton } from "@/components/medicine/SearchResults";
import { hasLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/getDictionary";
import { fill } from "@/lib/utils";
import { findConditions } from "@/server/services/condition.service";
import { searchMedicines } from "@/server/services/search.service";
import { ConditionChips } from "@/components/conditions/ConditionViews";
import { firstParams } from "@/server/validators/medicine";
import { searchPageQuery } from "@/server/validators/search";

type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: PageProps<"/[lang]/search">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  // Internal search result pages shouldn't be indexed (thin/duplicate content).
  return { title: getDictionary(lang).searchPage.title, robots: { index: false, follow: true } };
}

export default async function SearchPage({ params, searchParams }: PageProps<"/[lang]/search">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="sr-only">{t.searchPage.title}</h1>
      <Suspense
        fallback={
          <>
            <SearchBar lang={lang} t={t.search} />
            <div className="mt-8">
              <SearchResultsSkeleton />
            </div>
          </>
        }
      >
        <SearchArea lang={lang} t={t} searchParams={searchParams} />
      </Suspense>
      <Disclaimer text={t.disclaimer} className="mt-10" />
    </section>
  );
}

async function SearchArea({ lang, t, searchParams }: { lang: Locale; t: Dictionary; searchParams: SP }) {
  const { q, page } = searchPageQuery.parse(firstParams(await searchParams));

  return (
    <>
      {/* key: reset the input when navigating between searches */}
      <SearchBar key={q} lang={lang} t={t.search} defaultValue={q} autoFocus={!q} />
      {q ? (
        <div className="mt-8">
          <h2 className="mb-1 text-xl font-semibold">{fill(t.searchPage.resultsFor, { q })}</h2>
          <Suspense key={`${q}|${page}`} fallback={<SearchResultsSkeleton />}>
            <Results lang={lang} t={t.searchPage} conditionsHeading={t.conditions.searchHeading} q={q} page={page} />
          </Suspense>
        </div>
      ) : (
        <p className="mt-6 text-center text-muted">{t.searchPage.prompt}</p>
      )}
    </>
  );
}

async function Results({
  lang,
  t,
  conditionsHeading,
  q,
  page,
}: {
  lang: Locale;
  t: Dictionary["searchPage"];
  conditionsHeading: string;
  q: string;
  page: number;
}) {
  await connection(); // Mongoose uses new Date() internally → request-time only
  const [data, conditions] = await Promise.all([searchMedicines(q, page), page === 1 ? findConditions(q) : []]);
  return (
    <>
      {conditions.length > 0 && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-medium text-muted">{conditionsHeading}</p>
          <ConditionChips lang={lang} items={conditions} />
        </div>
      )}
      <SearchResults lang={lang} t={t} q={q} data={data} />
    </>
  );
}
