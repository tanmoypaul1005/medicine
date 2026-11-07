import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connectDB } from "@/lib/db";
import { Medicine } from "@/models";

/** Medicines per sitemap file (x2 locales = 20k URLs, under Google's 50k limit). */
export const SITEMAP_CHUNK = 10_000;

export async function countMedicines(): Promise<number> {
  "use cache";
  cacheLife("days");
  cacheTag("medicines");
  await connectDB();
  return Medicine.estimatedDocumentCount();
}

/** One sitemap chunk of medicine slugs, stable order by _id. */
export async function medicineSlugsChunk(chunk: number): Promise<{ slug: string; lastModified: string | null }[]> {
  "use cache";
  cacheLife("days");
  cacheTag("medicines");
  await connectDB();
  const docs = await Medicine.find()
    .sort({ _id: 1 })
    .skip(chunk * SITEMAP_CHUNK)
    .limit(SITEMAP_CHUNK)
    .select("slug updatedAt")
    .lean();
  return docs.map((d) => ({ slug: d.slug, lastModified: d.updatedAt ? new Date(d.updatedAt).toISOString() : null }));
}

/** Sitemap file ids: 0 = static pages + conditions, 1..n = medicine chunks. */
export async function sitemapIds(): Promise<number[]> {
  const chunks = Math.ceil((await countMedicines()) / SITEMAP_CHUNK);
  return [0, ...Array.from({ length: chunks }, (_, i) => i + 1)];
}
