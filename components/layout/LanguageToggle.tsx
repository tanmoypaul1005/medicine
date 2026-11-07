"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Languages } from "lucide-react";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";

type Props = { lang: Locale; label: string; aria: string };

export function LanguageToggle({ lang, label, aria }: Props) {
  const pathname = usePathname();
  const next: Locale = lang === "bn" ? "en" : "bn";
  const target = pathname.replace(/^\/(bn|en)(?=\/|$)/, `/${next}`);

  return (
    <Link
      href={target}
      hrefLang={next}
      aria-label={aria}
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-card transition"
    >
      <Languages className="size-4" aria-hidden />
      {label}
    </Link>
  );
}
