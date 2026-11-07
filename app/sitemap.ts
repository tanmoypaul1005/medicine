import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/seo";
import { listConditions } from "@/server/services/condition.service";
import { medicineSlugsChunk, sitemapIds } from "@/server/services/seo.service";

// Served at /sitemap/<id>.xml (all listed in /robots.txt). Every URL is listed per locale with its
// bn/en alternates so search engines connect the language versions.
const STATIC_PATHS: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/medicines", priority: 0.8, changeFrequency: "daily" },
  { path: "/conditions", priority: 0.7, changeFrequency: "weekly" },
  { path: "/interactions", priority: 0.6, changeFrequency: "monthly" },
  { path: "/scan", priority: 0.6, changeFrequency: "monthly" },
];

export async function generateSitemaps() {
  return (await sitemapIds()).map((id) => ({ id }));
}

function localized(path: string, extra: Omit<MetadataRoute.Sitemap[number], "url" | "alternates">): MetadataRoute.Sitemap {
  const languages = { bn: `${SITE_URL}/bn${path}`, en: `${SITE_URL}/en${path}` };
  return locales.map((lang) => ({ url: `${SITE_URL}/${lang}${path}`, alternates: { languages }, ...extra }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);

  if (id === 0) {
    const conditions = await listConditions();
    return [
      ...STATIC_PATHS.flatMap((s) => localized(s.path, { changeFrequency: s.changeFrequency, priority: s.priority })),
      ...conditions.flatMap((c) => localized(`/condition/${c.slug}`, { changeFrequency: "monthly", priority: 0.7 })),
    ];
  }

  const meds = await medicineSlugsChunk(id - 1);
  return meds.flatMap((m) =>
    localized(`/medicine/${m.slug}`, {
      changeFrequency: "weekly",
      priority: 0.6,
      ...(m.lastModified && { lastModified: m.lastModified }),
    })
  );
}
