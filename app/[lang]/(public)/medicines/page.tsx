import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Disclaimer } from "@/components/medicine/Disclaimer";
import { BrandList } from "@/components/medicine/BrandList";
import { MedicineFilters } from "@/components/medicine/MedicineFilters";
import { MedicineTable, MedicineTableSkeleton, ViewToggle } from "@/components/medicine/MedicineTable";
import { hasLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { pageMeta } from "@/lib/seo";
import { listBrands, listMedicines } from "@/server/services/medicine.service";
import { firstParams, medicineListQuery } from "@/server/validators/medicine";

export async function generateMetadata({ params }: PageProps<"/[lang]/medicines">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = getDictionary(lang).medicines;
  return pageMeta(lang, "/medicines", { title: t.title, description: t.subtitle });
}

export default async function MedicinesPage({ params, searchParams }: PageProps<"/[lang]/medicines">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.medicines.title}</h1>
      <p className="mt-1 text-muted">{t.medicines.subtitle}</p>

      <div className="mt-6 space-y-6">
        <Suspense fallback={<MedicineTableSkeleton />}>
          <Results lang={lang} t={t.medicines} searchParams={searchParams} />
        </Suspense>
        <Disclaimer text={t.disclaimer} />
      </div>
    </section>
  );
}

async function Results({
  lang,
  t,
  searchParams,
}: {
  lang: Locale;
  t: ReturnType<typeof getDictionary>["medicines"];
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection(); // Mongoose uses new Date() internally → must be request-time, not prerender
  const query = medicineListQuery.parse(firstParams(await searchParams));
  return (
    <>
      <ViewToggle lang={lang} t={t} query={query} />
      {/* key: reset local search text when the view/filters change via links (toggle, reset) */}
      <MedicineFilters
        key={`${query.view}|${query.type}|${query.sort}`}
        lang={lang}
        t={{ searchPlaceholder: t.searchPlaceholder, reset: t.reset, types: t.types, sorts: t.sorts }}
        query={query}
      />
      {query.view === "brand" ? (
        <BrandList lang={lang} t={t} query={query} data={await listBrands(query)} />
      ) : (
        <MedicineTable lang={lang} t={t} query={query} data={await listMedicines(query)} />
      )}
    </>
  );
}
