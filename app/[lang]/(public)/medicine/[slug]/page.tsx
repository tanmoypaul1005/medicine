import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Disclaimer } from "@/components/medicine/Disclaimer";
import { Alternatives, GenericInfo, MedicineHeader, Variants } from "@/components/medicine/MedicineDetailView";
import { hasLocale, href } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { formatPrice } from "@/lib/format";
import { fill } from "@/lib/utils";
import { getMedicineDetail } from "@/server/services/medicineDetail.service";

type Params = PageProps<"/[lang]/medicine/[slug]">["params"];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const m = await getMedicineDetail(slug);
  // notFound() here (before streaming starts) gives a real 404 status; inside <Suspense> it'd be a soft 200.
  if (!m) notFound();
  const t = getDictionary(lang).medicine;
  const name = [m.brand, m.strength, m.dosageForm].filter(Boolean).join(" ");
  return {
    title: fill(t.metaTitle, { name }),
    description: fill(t.metaDesc, {
      name,
      generic: m.generic?.name ?? m.genericNameRaw ?? "",
      maker: m.manufacturerName ?? "",
      price: m.unitPrice != null ? formatPrice(lang, m.unitPrice) : t.noPrice,
    }),
    alternates: {
      canonical: `/${lang}/medicine/${slug}`,
      languages: { bn: `/bn/medicine/${slug}`, en: `/en/medicine/${slug}` },
    },
  };
}

// Blocking on purpose: params + cached data are awaited outside <Suspense> so an unknown slug
// returns a real 404 (inside Suspense it would stream a soft 404 with HTTP 200). Data is "use cache" → fast.
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
  // "use cache" (hours) — no connection() needed. Awaited outside <Suspense> on purpose: unknown slug → real 404 status.
  const m = await getMedicineDetail(slug);
  if (!m) notFound();
  const dict = getDictionary(lang);
  const t = dict.medicine;

  return (
    <>
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
