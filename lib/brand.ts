import type { Locale } from "@/lib/i18n/config";

/** Site name per language (user decision): Bangla UI → "ওষুধখুঁজি", English UI → "OshudKhuji". */
export const SITE_NAMES: Record<Locale, string> = { bn: "ওষুধখুঁজি", en: "OshudKhuji" };

export const siteName = (lang: Locale) => SITE_NAMES[lang];

/** Language-neutral name (Latin) for places without a locale: JSON-LD Organization, OG image alt, user agents. */
export const SITE_NAME_LATIN = SITE_NAMES.en;
