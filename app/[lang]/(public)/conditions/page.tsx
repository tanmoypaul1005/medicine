import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConditionGrid } from "@/components/conditions/ConditionViews";
import { Disclaimer } from "@/components/medicine/Disclaimer";
import { hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { pageMeta } from "@/lib/seo";
import { listConditions } from "@/server/services/condition.service";

export async function generateMetadata({ params }: PageProps<"/[lang]/conditions">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = getDictionary(lang).conditions;
  return pageMeta(lang, "/conditions", { title: t.title, description: t.subtitle });
}

export default async function ConditionsPage({ params }: PageProps<"/[lang]/conditions">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const items = await listConditions(); // "use cache"

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{dict.conditions.title}</h1>
      <p className="mt-2 max-w-2xl text-muted">{dict.conditions.subtitle}</p>
      <Disclaimer text={dict.disclaimer} className="mt-6" />
      <div className="mt-8">
        <ConditionGrid lang={lang} t={dict.conditions} items={items} />
      </div>
    </section>
  );
}
