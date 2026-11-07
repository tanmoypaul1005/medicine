import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { sitemapIds } from "@/server/services/seo.service";

// /robots.txt — crawl everything public; skip APIs and personal/thin pages (also noindex in their metadata).
export default async function robots(): Promise<MetadataRoute.Robots> {
  const ids = await sitemapIds();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/bn/search", "/en/search", "/bn/scan/result", "/en/scan/result"],
      },
    ],
    // Index first (the URL to submit), then the parts for crawlers that ignore indexes
    sitemap: [`${SITE_URL}/sitemap.xml`, ...ids.map((id) => `${SITE_URL}/sitemap/${id}.xml`)],
    host: SITE_URL,
  };
}
