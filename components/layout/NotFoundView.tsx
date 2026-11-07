"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { SearchX } from "lucide-react";
import { SearchBar } from "@/components/medicine/SearchBar";
import { defaultLocale, hasLocale, href } from "@/lib/i18n/config";
import bn from "@/lib/i18n/dictionaries/bn";
import en from "@/lib/i18n/dictionaries/en";

// not-found.tsx receives no params, so the locale is read on the client.
export function NotFoundView() {
  const params = useParams<{ lang?: string }>();
  const lang = params.lang && hasLocale(params.lang) ? params.lang : defaultLocale;
  const t = lang === "en" ? en : bn;

  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center sm:py-24">
      <SearchX className="size-12 text-muted" aria-hidden />
      <p className="mt-4 text-sm font-semibold text-brand">404</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{t.notFound.title}</h1>
      <p className="mt-3 text-muted">{t.notFound.body}</p>
      <SearchBar lang={lang} t={t.search} className="mt-8" />
      <div className="mt-6 flex gap-4 text-sm font-medium">
        <Link href={href(lang)} className="text-brand hover:underline">
          {t.notFound.home}
        </Link>
        <Link href={href(lang, "/medicines")} className="text-brand hover:underline">
          {t.notFound.browse}
        </Link>
      </div>
    </section>
  );
}
