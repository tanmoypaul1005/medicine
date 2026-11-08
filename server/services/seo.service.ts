import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Generic, Medicine } from "@/models";

/** Medicine pages listed in the sitemap (user decision: only the top N; the rest stay indexable via internal links). */
export const SITEMAP_TOP_MEDICINES = 100;

/**
 * "Top" medicines (no popularity data yet): top generics by brandCount, one medicine each =
 * that generic's most common strength+form, cheapest priced brand within it.
 */
export async function topMedicineSlugs(): Promise<{ slug: string; lastModified: string | null }[]> {
  "use cache";
  cacheLife("days");
  cacheTag("medicines");
  await connectDB();

  const generics = await Generic.find({ brandCount: { $gt: 0 } })
    .sort({ brandCount: -1, name: 1 })
    .limit(SITEMAP_TOP_MEDICINES * 2) // spare: some generics may have no priced medicine
    .select("_id")
    .lean();
  const rank = new Map(generics.map((g, i) => [String(g._id), i]));

  const picks = await Medicine.aggregate<{ _id: Types.ObjectId; slug: string; updatedAt?: Date }>([
    { $match: { genericId: { $in: generics.map((g) => g._id) }, unitPrice: { $ne: null } } },
    { $sort: { unitPrice: 1, brand: 1 } },
    {
      $group: {
        _id: { g: "$genericId", s: "$strength", f: "$formSlug" },
        n: { $sum: 1 },
        slug: { $first: "$slug" },
        updatedAt: { $first: "$updatedAt" },
      },
    },
    { $sort: { n: -1, slug: 1 } },
    { $group: { _id: "$_id.g", slug: { $first: "$slug" }, updatedAt: { $first: "$updatedAt" } } },
  ]);

  return picks
    .sort((a, b) => (rank.get(String(a._id)) ?? 1e9) - (rank.get(String(b._id)) ?? 1e9))
    .slice(0, SITEMAP_TOP_MEDICINES)
    .map((p) => ({ slug: p.slug, lastModified: p.updatedAt ? new Date(p.updatedAt).toISOString() : null }));
}

/** Sitemap file ids: 0 = static pages + conditions, 1 = top medicines. */
export async function sitemapIds(): Promise<number[]> {
  return [0, 1];
}
