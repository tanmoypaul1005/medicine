import "server-only";
import { locales } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/seo";
import { listConditions } from "@/server/services/condition.service";
import { medicineSlugsChunk } from "@/server/services/seo.service";

// XML builders for /sitemap.xml (index) and /sitemap/<id>.xml (parts). Route handlers in app/.
// id 0 = static pages + conditions; id 1..n = medicines (10k each), every URL in bn + en with hreflang.

const STATIC_PATHS: { path: string; priority: number; changefreq: "daily" | "weekly" | "monthly" }[] = [
  { path: "", priority: 1, changefreq: "daily" },
  { path: "/medicines", priority: 0.8, changefreq: "daily" },
  { path: "/conditions", priority: 0.7, changefreq: "weekly" },
  { path: "/interactions", priority: 0.6, changefreq: "monthly" },
  { path: "/scan", priority: 0.6, changefreq: "monthly" },
  { path: "/cost-calculator", priority: 0.6, changefreq: "monthly" },
];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Entry = { path: string; priority: number; changefreq: string; lastmod?: string | null };

/** One <url> per locale, each listing all language versions (+ x-default → bn). */
function urlsFor(e: Entry): string {
  const alt =
    locales.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${esc(`${SITE_URL}/${l}${e.path}`)}"/>`).join("") +
    `<xhtml:link rel="alternate" hreflang="x-default" href="${esc(`${SITE_URL}/bn${e.path}`)}"/>`;
  return locales
    .map(
      (l) =>
        `<url><loc>${esc(`${SITE_URL}/${l}${e.path}`)}</loc>${alt}` +
        (e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : "") +
        `<changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`
    )
    .join("\n");
}

export async function sitemapPartXml(id: number): Promise<string> {
  let entries: Entry[];
  if (id === 0) {
    const conditions = await listConditions();
    entries = [
      ...STATIC_PATHS,
      ...conditions.map((c) => ({ path: `/condition/${c.slug}`, priority: 0.7, changefreq: "monthly" })),
    ];
  } else {
    const meds = await medicineSlugsChunk(id - 1);
    entries = meds.map((m) => ({ path: `/medicine/${m.slug}`, priority: 0.6, changefreq: "weekly", lastmod: m.lastModified }));
  }
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    entries.map(urlsFor).join("\n") +
    `\n</urlset>\n`
  );
}

export function sitemapIndexXml(ids: number[]): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    ids.map((id) => `  <sitemap><loc>${esc(`${SITE_URL}/sitemap/${id}.xml`)}</loc></sitemap>`).join("\n") +
    `\n</sitemapindex>\n`
  );
}

export const XML_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=86400",
};
