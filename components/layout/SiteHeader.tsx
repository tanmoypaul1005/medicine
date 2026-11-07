import Link from "next/link";
import { Pill } from "lucide-react";
import { href, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import { LanguageToggle } from "./LanguageToggle";

type Props = { lang: Locale; t: Dictionary };

export function SiteHeader({ lang, t }: Props) {
  const nav = [
    { path: "/medicines", label: t.nav.medicines },
    { path: "/interactions", label: t.nav.interactions },
    { path: "/scan", label: t.nav.scan },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href={href(lang)} className="flex items-center gap-2 font-bold text-lg">
          <span className="grid size-8 place-items-center rounded-lg bg-brand text-white dark:text-slate-900">
            <Pill className="size-4" aria-hidden />
          </span>
          MedicineMate
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted sm:flex">
          {nav.map((n) => (
            <Link key={n.path} href={href(lang, n.path)} className="hover:text-foreground transition">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageToggle lang={lang} label={t.langToggle.label} aria={t.langToggle.aria} />
          <Link
            href={href(lang, "/account")}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-card transition"
          >
            {t.nav.login}
          </Link>
        </div>
      </div>
    </header>
  );
}
