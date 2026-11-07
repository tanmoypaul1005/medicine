import { notFound } from "next/navigation";
import { Camera } from "lucide-react";
import { ComingSoon, comingSoonMetadata } from "@/components/layout/ComingSoon";
import { hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/getDictionary";

export const generateMetadata = ({ params }: PageProps<"/[lang]/scan">) => comingSoonMetadata(params, (t) => t.nav.scan);

export default async function ScanPage({ params }: PageProps<"/[lang]/scan">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <ComingSoon lang={lang} title={getDictionary(lang).nav.scan} icon={Camera} />;
}
