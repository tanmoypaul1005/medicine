import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Suspense } from "react";
import { DgdaStatus } from "@/components/medicine/DgdaStatus";
import { Disclaimer } from "@/components/medicine/Disclaimer";
import { Alternatives, GenericInfo, MedicineHeader, Variants } from "@/components/medicine/MedicineDetailView";
import { breadcrumbLd, JsonLd } from "@/components/seo/JsonLd";
import { hasLocale, href, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { localizedNotFound } from "@/lib/i18n/notFound";
import { formatPrice, priceBasis } from "@/lib/format";
import { absoluteUrl, pageMeta } from "@/lib/seo";
import { fill } from "@/lib/utils";
import { getMedicineDetail, type MedicineDetail } from "@/server/services/medicineDetail.service";

type Params = PageProps<"/[lang]/medicine/[slug]">["params"];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const m = await getMedicineDetail(slug);
  if (!m) localizedNotFound(lang); // see lib/i18n/notFound.ts
  const t = getDictionary(lang).medicine;
  const name = [m.brand, m.strength, m.dosageForm].filter(Boolean).join(" ");
  const price = m.unitPrice != null ? `${formatPrice(lang, m.unitPrice)} ${priceBasis(m.priceLabel, t.perUnit)}` : t.noPrice;
  return pageMeta(lang, `/medicine/${slug}`, {
    title: fill(t.metaTitle, { name }),
    description: fill(t.metaDesc, {
      name,
      generic: m.generic?.name ?? m.genericNameRaw ?? "",
      maker: m.manufacturerName ?? "",
      price,
    }),
  });
}

/** schema.org Drug — lets search engines understand brand, ingredient, maker, form and price. */
function drugLd(lang: Locale, m: MedicineDetail) {
  const url = absoluteUrl(lang, `/medicine/${m.slug}`);
  const generic = m.generic?.name ?? m.genericNameRaw ?? undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Drug",
    "@id": url,
    url,
    name: [m.brand, m.strength].filter(Boolean).join(" "),
    isProprietary: true,
    ...(generic && { nonProprietaryName: generic, activeIngredient: generic }),
    dosageForm: m.dosageForm,
    ...(m.manufacturerName && { manufacturer: { "@type": "Organization", name: m.manufacturerName } }),
    ...(m.generic?.drugClass && { drugClass: { "@type": "DrugClass", name: m.generic.drugClass } }),
    ...(m.generic?.pregnancyCategory && { pregnancyCategory: `https://schema.org/FDAcategory${m.generic.pregnancyCategory}` }),
    ...(m.unitPrice != null && {
      offers: {
        "@type": "Offer",
        price: m.unitPrice,
        priceCurrency: "BDT",
        ...(m.priceLabel && { description: m.priceLabel }),
      },
    }),
  };
}

// Blocking on purpose: params + cached data are awaited outside <Suspense> so an unknown slug
// redirects to the real 404 (inside Suspense it would stream a soft 404 with HTTP 200). Data is "use cache" → fast.
export const instant = false;

// Prerender the most-viewed pages at build; every other slug renders on first request, then is cached.
export async function generateStaticParams() {
  return ["napa-500-mg-tablet", "seclo-20-mg-capsule-delayed-release", "fexo-120-mg-tablet"].map((slug) => ({ slug }));
}

export default async function MedicinePage({ params }: { params: Params }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <Detail params={params} />
    </div>
  );
}

async function Detail({ params }: { params: Params }) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  // "use cache" (hours) — no connection() needed. Awaited outside <Suspense> on purpose so an
  // unknown slug can redirect to the global 404 before anything streams.
  const m = await getMedicineDetail(slug);
  if (!m) localizedNotFound(lang);
  const dict = getDictionary(lang);
  const t = dict.medicine;

  return (
    <>
      <JsonLd
        data={[
          drugLd(lang, m),
          breadcrumbLd([
            [t.home, absoluteUrl(lang)],
            [t.list, absoluteUrl(lang, "/medicines")],
            [[m.brand, m.strength].filter(Boolean).join(" "), absoluteUrl(lang, `/medicine/${m.slug}`)],
          ]),
        ]}
      />
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm text-muted">
        <Link href={href(lang)} className="hover:text-foreground">
          {t.home}
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <Link href={href(lang, "/medicines")} className="hover:text-foreground">
          {t.list}
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="truncate text-foreground">{m.brand}</span>
      </nav>

      <MedicineHeader lang={lang} t={t} m={m} />
      <Disclaimer text={dict.disclaimer} className="mt-4" />
      <div className="mt-4">
        <Suspense fallback={null}>
          <DgdaStatus
            lang={lang}
            t={dict.dgda}
            m={{ brand: m.brand, manufacturerName: m.manufacturerName, strength: m.strength, dosageForm: m.dosageForm }}
          />
        </Suspense>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="order-2 lg:order-1">
          <GenericInfo t={t} m={m} />
        </div>
        <div className="order-1 space-y-10 lg:order-2">
          <Alternatives lang={lang} t={t} m={m} />
          <Variants lang={lang} t={t} m={m} />
        </div>
      </div>
    </>
  );
}
