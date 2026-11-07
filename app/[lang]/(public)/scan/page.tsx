import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Camera } from "lucide-react";
import { Disclaimer } from "@/components/medicine/Disclaimer";
import { ScanFlow } from "@/components/scan/ScanFlow";
import { hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/getDictionary";

export async function generateMetadata({ params }: PageProps<"/[lang]/scan">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = getDictionary(lang).scan;
  return { title: t.title, description: t.subtitle };
}

export default async function ScanPage({ params }: PageProps<"/[lang]/scan">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const t = dict.scan;

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <Camera className="size-6" aria-hidden />
        </span>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.title}</h1>
      </div>
      <p className="mt-2 text-muted">{t.subtitle}</p>

      <div className="mt-6">
        <ScanFlow
          lang={lang}
          t={{
            privacy: t.privacy,
            pick: t.pick,
            pickHint: t.pickHint,
            reading: t.reading,
            reviewTitle: t.reviewTitle,
            reviewHint: t.reviewHint,
            written: t.written,
            unsure: t.unsure,
            notThis: t.notThis,
            noMatch: t.noMatch,
            showResults: t.showResults,
            retake: t.retake,
            selectedCount: t.selectedCount,
            perUnit: t.perUnit,
            errors: t.errors,
          }}
        />
      </div>

      <Disclaimer text={dict.disclaimer} className="mt-8" />
    </section>
  );
}
