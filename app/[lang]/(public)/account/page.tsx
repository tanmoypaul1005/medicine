import { notFound } from "next/navigation";
import { UserRound } from "lucide-react";
import { ComingSoon, comingSoonMetadata } from "@/components/layout/ComingSoon";
import { hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/getDictionary";

export const generateMetadata = ({ params }: PageProps<"/[lang]/account">) => comingSoonMetadata(params, (t) => t.nav.login);

export default async function AccountPage({ params }: PageProps<"/[lang]/account">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <ComingSoon lang={lang} title={getDictionary(lang).nav.login} icon={UserRound} />;
}
