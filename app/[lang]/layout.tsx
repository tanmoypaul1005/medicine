import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Hind_Siliguri, Inter } from "next/font/google";
import { StoreProvider } from "@/store/StoreProvider";
import { hasLocale, locales } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { siteName } from "@/lib/brand";
import { GOOGLE_SITE_VERIFICATION, OG_IMAGE, SITE_URL } from "@/lib/seo";
import "../globals.css";
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const hind = Hind_Siliguri({
  variable: "--font-bangla",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = getDictionary(lang).meta;
  // Site-wide defaults only. Canonical/hreflang are set per page (lib/seo.ts pageMeta) — never here,
  // or every page would inherit the home page's alternates.
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.title, template: `%s | ${siteName(lang)}` },
    description: t.description,
    applicationName: siteName(lang),
    formatDetection: { telephone: false, email: false, address: false },
    openGraph: { type: "website", siteName: siteName(lang), locale: lang === "bn" ? "bn_BD" : "en_US", images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", images: [OG_IMAGE.url] },
    // <meta name="google-site-verification"> for Google Search Console (only when the env var is set)
    ...(GOOGLE_SITE_VERIFICATION && { verification: { google: GOOGLE_SITE_VERIFICATION } }),
  };
}

export const viewport: Viewport = { themeColor: "#0f766e" };

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  return (
    <html lang={lang} className={`${inter.variable} ${hind.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Analytics />
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
