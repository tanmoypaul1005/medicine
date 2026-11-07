import { sitemapIds } from "@/server/services/seo.service";
import { sitemapIndexXml, XML_HEADERS } from "@/server/services/sitemap";

// GET /sitemap.xml — sitemap INDEX. Submit this one URL in Google Search Console.
// Lists /sitemap/0.xml (pages + conditions) and /sitemap/1..n.xml (medicines).
export async function GET() {
  return new Response(sitemapIndexXml(await sitemapIds()), { headers: XML_HEADERS });
}
