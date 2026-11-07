export const locales = ["bn", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "bn";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Prefix an app path with the locale: href("en", "/search") -> "/en/search" */
export function href(lang: Locale, path = "/"): string {
  return `/${lang}${path === "/" ? "" : path}`;
}
