import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { SearchBar } from "@/components/medicine/SearchBar";
import { hasLocale, href, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/getDictionary";

type Props = { lang: Locale; title: string; icon: LucideIcon };

/** Placeholder for planned features linked from the header (200 + noindex, not a 404). */
export function ComingSoon({ lang, title, icon: Icon }: Props) {
  const t = getDictionary(lang);
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center sm:py-24">
      <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
        <Icon className="size-7" aria-hidden />
      </span>
      <span className="mt-5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted">
        {t.comingSoon.badge}
      </span>
      <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-3 text-muted">{t.comingSoon.body}</p>
      <SearchBar lang={lang} t={t.search} className="mt-8" />
      <div className="mt-6 flex gap-4 text-sm font-medium">
        <Link href={href(lang)} className="text-brand hover:underline">
          {t.comingSoon.home}
        </Link>
        <Link href={href(lang, "/medicines")} className="text-brand hover:underline">
          {t.comingSoon.browse}
        </Link>
      </div>
    </section>
  );
}

export async function comingSoonMetadata(
  params: Promise<{ lang: string }>,
  pick: (t: ReturnType<typeof getDictionary>) => string
): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: pick(getDictionary(lang)), robots: { index: false, follow: true } };
}
