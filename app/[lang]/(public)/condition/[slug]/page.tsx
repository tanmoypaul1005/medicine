import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Info } from "lucide-react";
import { ConditionIcon, ConditionMedicines, conditionName, RedFlags } from "@/components/conditions/ConditionViews";
import { Disclaimer } from "@/components/medicine/Disclaimer";
import { hasLocale, href } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { localizedNotFound } from "@/lib/i18n/notFound";
import { fill } from "@/lib/utils";
import { getCondition, listConditions } from "@/server/services/condition.service";

type Params = PageProps<"/[lang]/condition/[slug]">["params"];

// Small, known set → prerender all; unknown slug → real 404 (see CLAUDE.md 404 notes).
export const instant = false;

export async function generateStaticParams() {
  return (await listConditions()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const c = await getCondition(slug);
  if (!c) localizedNotFound(lang);
  const t = getDictionary(lang).conditions;
  return {
    title: fill(t.metaTitle, { name: conditionName(lang, c) }),
    description: lang === "bn" ? c.summaryBn : c.summaryEn,
    alternates: { languages: { bn: `/bn/condition/${slug}`, en: `/en/condition/${slug}` } },
  };
}

export default async function ConditionPage({ params }: { params: Params }) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) localizedNotFound("bn");
  const c = await getCondition(slug); // "use cache"
  if (!c) localizedNotFound(lang);
  const dict = getDictionary(lang);
  const t = dict.conditions;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm text-muted">
        <Link href={href(lang)} className="hover:text-foreground">
          {dict.medicine.home}
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <Link href={href(lang, "/conditions")} className="hover:text-foreground">
          {t.homeTitle}
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="truncate text-foreground">{conditionName(lang, c)}</span>
      </nav>

      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <ConditionIcon icon={c.icon} className="size-6" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{conditionName(lang, c)}</h1>
      </div>
      <p className="mt-3 text-muted">{lang === "bn" ? c.summaryBn : c.summaryEn}</p>

      {/* Safety first: warning signs before any medicine */}
      <div className="mt-6">
        <RedFlags t={t} items={lang === "bn" ? c.redFlagsBn : c.redFlagsEn} />
      </div>
      <Disclaimer text={dict.disclaimer} className="mt-4" />

      <div className="mt-10">
        <ConditionMedicines lang={lang} t={t} c={c} />
      </div>

      <p className="mt-8 flex items-start gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          {t.noDose}
          {!c.reviewed && <span className="mt-1 block text-xs">{t.pendingReview}</span>}
        </span>
      </p>
    </div>
  );
}
