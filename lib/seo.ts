import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";

// Public site origin for absolute URLs (sitemap, canonical, Open Graph, JSON-LD).
// Set SITE_URL in production (e.g. https://medicinemate.com.bd). Not secret, server-only use.
export const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
export const SITE_NAME = "MedicineMate";

const OG_LOCALE: Record<Locale, string> = { bn: "bn_BD", en: "en_US" };

/** canonical + hreflang (bn, en, x-default → bn) for a path WITHOUT the locale prefix ("" | "/medicine/napa-500-mg-tablet"). */
export function alternatesFor(lang: Locale, path = ""): NonNullable<Metadata["alternates"]> {
  return {
    canonical: `/${lang}${path}`,
    languages: { bn: `/bn${path}`, en: `/en${path}`, "x-default": `/bn${path}` },
  };
}

export const absoluteUrl = (lang: Locale, path = "") => `${SITE_URL}/${lang}${path}`;

/**
 * Full metadata for an indexable page: title, description, canonical, hreflang, Open Graph, Twitter.
 * Open Graph images come from app/[lang]/opengraph-image.tsx automatically.
 */
export function pageMeta(
  lang: Locale,
  path: string,
  { title, description, absoluteTitle = false }: { title: string; description: string; absoluteTitle?: boolean }
): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  // A page-level openGraph object replaces the file-based image, so reference it explicitly.
  const image = { url: `/${lang}/opengraph-image`, width: 1200, height: 630, alt: SITE_NAME };
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: alternatesFor(lang, path),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: OG_LOCALE[lang],
      alternateLocale: OG_LOCALE[lang === "bn" ? "en" : "bn"],
      url: `/${lang}${path}`,
      title: fullTitle,
      description,
      images: [image],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [image.url] },
  };
}

/** Pages that must not appear in search results (personal or thin content). */
export const NO_INDEX: Metadata["robots"] = { index: false, follow: true };
