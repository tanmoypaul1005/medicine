import type { Metadata } from "next";
import { SITE_NAME_LATIN, siteName } from "@/lib/brand";
import type { Locale } from "@/lib/i18n/config";

/**
 * Public site origin for absolute URLs (sitemap, canonical, Open Graph, JSON-LD).
 * Order: SITE_URL (set this for a custom domain) → Vercel production domain → Vercel deployment URL
 * → localhost (dev only). Never let production fall back to localhost: share previews (WhatsApp,
 * Facebook) download og:image from this origin and show nothing if it's unreachable.
 */
function resolveSiteUrl(): string {
  const env = process.env;
  if (env.SITE_URL) return env.SITE_URL;
  if (env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return "http://localhost:3000";
}
export const SITE_URL = resolveSiteUrl().replace(/\/+$/, "");
/** Latin name for locale-less places; per-language name: siteName(lang) from lib/brand.ts. */
export const SITE_NAME = SITE_NAME_LATIN;

const OG_LOCALE: Record<Locale, string> = { bn: "bn_BD", en: "en_US" };

/** canonical + hreflang (bn, en, x-default → bn) for a path WITHOUT the locale prefix ("" | "/medicine/napa-500-mg-tablet"). */
export function alternatesFor(lang: Locale, path = ""): NonNullable<Metadata["alternates"]> {
  return {
    canonical: `/${lang}${path}`,
    languages: { bn: `/bn${path}`, en: `/en${path}`, "x-default": `/bn${path}` },
  };
}

/**
 * Share image for every page (WhatsApp, Facebook, X, LinkedIn): public/og-image.png, 1200x630, <300KB.
 * Source screenshot: public/ogImage.png (resized/cropped). Replace og-image.png to change it.
 */
export const OG_IMAGE = { url: "/og-image.png", width: 1200, height: 630, alt: SITE_NAME, type: "image/png" };

/**
 * Google Search Console "HTML tag" verification code from env GOOGLE_SITE_VERIFICATION_KEY.
 * Accepts just the code or the whole tag Google shows (`<meta name="google-site-verification" content="…" />`).
 */
export const GOOGLE_SITE_VERIFICATION = (() => {
  const raw = process.env.GOOGLE_SITE_VERIFICATION_KEY?.trim();
  if (!raw) return undefined;
  return (raw.match(/content=["']([^"']+)["']/)?.[1] ?? raw).trim() || undefined;
})();

export const absoluteUrl =(lang: Locale, path = "") => `${SITE_URL}/${lang}${path}`;

/**
 * Full metadata for an indexable page: title, description, canonical, hreflang, Open Graph, Twitter
 * (share image = OG_IMAGE).
 */
export function pageMeta(
  lang: Locale,
  path: string,
  { title, description, absoluteTitle = false }: { title: string; description: string; absoluteTitle?: boolean }
): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} | ${siteName(lang)}`;
  const image = OG_IMAGE;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: alternatesFor(lang, path),
    openGraph: {
      type: "website",
      siteName: siteName(lang),
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
