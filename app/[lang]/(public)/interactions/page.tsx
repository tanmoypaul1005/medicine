import { notFound } from "next/navigation";
import { GitCompareArrows } from "lucide-react";
import { ComingSoon, comingSoonMetadata } from "@/components/layout/ComingSoon";
import { hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/getDictionary";

export const generateMetadata = ({ params }: PageProps<"/[lang]/interactions">) =>
  comingSoonMetadata(params, (t) => t.nav.interactions);

export default async function InteractionsPage({ params }: PageProps<"/[lang]/interactions">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <ComingSoon lang={lang} title={getDictionary(lang).nav.interactions} icon={GitCompareArrows} />;
}
