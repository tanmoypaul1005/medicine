import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/getDictionary";

export default async function PublicLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);

  return (
    <>
      <SiteHeader lang={lang} t={t} />
      <main className="flex-1">{children}</main>
      <SiteFooter text={t.footer} />
    </>
  );
}
