import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { QueryFilter, SortOrder, Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Medicine, type MedicineDoc } from "@/models";
import { MEDICINE_PAGE_SIZE, type MedicineListQuery } from "@/server/validators/medicine";

export type MedicineRow = {
  id: string;
  slug: string;
  brand: string;
  type: "allopathic" | "herbal";
  strength: string | null;
  dosageForm: string;
  genericName: string | null;
  manufacturerName: string | null;
  unitPrice: number | null;
  priceLabel: string | null;
};

export type MedicineList = { rows: MedicineRow[]; total: number; page: number; pages: number };

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SORTS: Record<MedicineListQuery["sort"], Record<string, SortOrder>> = {
  brand: { brand: 1, strength: 1, _id: 1 },
  "price-asc": { unitPrice: 1, _id: 1 },
  "price-desc": { unitPrice: -1, _id: 1 },
};

// ---------- Brand-wise view (?view=brand) ----------
export type BrandVariant = { slug: string; strength: string | null; dosageForm: string; unitPrice: number | null; priceLabel: string | null };
export type BrandRow = {
  key: string; // brand + manufacturer (same name from two companies = two rows)
  brand: string;
  manufacturerName: string | null;
  genericNames: string[];
  type: "allopathic" | "herbal";
  variants: BrandVariant[]; // sorted by form, then price
  minUnit: number | null; // per-unit price range (null = only pack prices)
  maxUnit: number | null;
};
export type BrandList = { rows: BrandRow[]; total: number; page: number; pages: number };

/**
 * One row per brand (+company), with its strengths/forms. Same filters/sorts as the table view.
 * Two steps for speed: (1) group lightweight summaries + paginate, (2) load variants only for the
 * page's brands. Cached ("use cache"): the list is the same for every visitor.
 */
export async function listBrands(query: MedicineListQuery): Promise<BrandList> {
  "use cache";
  cacheLife("hours");
  cacheTag("medicines");
  const { q, type, sort, page } = query;
  await connectDB();
  const match: Record<string, unknown> = {};
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    match.$or = [{ brand: rx }, { genericName: rx }];
  }
  if (type !== "all") match.type = type;

  const perUnit = { $cond: [{ $eq: [{ $ifNull: ["$priceLabel", null] }, null] }, "$unitPrice", null] };
  const sortStage: Record<string, 1 | -1> =
    sort === "brand" ? { brandLower: 1, manufacturerName: 1 } : { minUnit: sort === "price-asc" ? 1 : -1, brandLower: 1 };

  type Summary = Omit<BrandRow, "key" | "variants"> & { _id: { b: string; m: Types.ObjectId | null } };
  // Step 1: lightweight per-brand summaries (no variant arrays) → sort → paginate
  const [res] = await Medicine.aggregate<{ rows: Summary[]; total: { n: number }[] }>([
    { $match: match },
    {
      $group: {
        _id: { b: "$brand", m: "$manufacturerId" },
        brand: { $first: "$brand" },
        manufacturerName: { $first: "$manufacturerName" },
        genericNames: { $addToSet: "$genericName" },
        type: { $first: "$type" },
        minUnit: { $min: perUnit },
        maxUnit: { $max: perUnit },
      },
    },
    ...(sort !== "brand" ? [{ $match: { minUnit: { $ne: null } } }] : []), // price sorts: only per-unit-priced brands
    { $addFields: { brandLower: { $toLower: "$brand" } } },
    { $sort: sortStage },
    {
      $facet: {
        rows: [{ $skip: (Math.max(page, 1) - 1) * MEDICINE_PAGE_SIZE }, { $limit: MEDICINE_PAGE_SIZE }],
        total: [{ $count: "n" }],
      },
    },
  ]);

  const total = res?.total[0]?.n ?? 0;
  const pages = Math.max(1, Math.ceil(total / MEDICINE_PAGE_SIZE));
  const summaries = res?.rows ?? [];

  // Step 2: variants for just this page's brands (same filters, so e.g. herbal stays herbal)
  const keyOf = (b: string, m: unknown) => `${b}|${String(m)}`;
  const variants = summaries.length
    ? await Medicine.find({ $and: [match, { $or: summaries.map((s) => ({ brand: s._id.b, manufacturerId: s._id.m })) }] })
        .select("brand manufacturerId slug strength dosageForm unitPrice priceLabel")
        .sort({ dosageForm: 1, unitPrice: 1 })
        .lean()
    : [];
  const byKey = new Map<string, BrandVariant[]>();
  for (const v of variants) {
    const k = keyOf(v.brand, v.manufacturerId);
    const list = byKey.get(k) ?? [];
    list.push({ slug: v.slug, strength: v.strength ?? null, dosageForm: v.dosageForm, unitPrice: v.unitPrice ?? null, priceLabel: v.priceLabel ?? null });
    byKey.set(k, list);
  }

  return {
    total,
    page: Math.min(page, pages),
    pages,
    rows: summaries.map((r) => {
      const key = keyOf(r._id.b, r._id.m);
      return {
        key,
        brand: r.brand,
        manufacturerName: r.manufacturerName ?? null,
        genericNames: (r.genericNames ?? []).filter(Boolean),
        type: r.type ?? "allopathic",
        minUnit: r.minUnit ?? null,
        maxUnit: r.maxUnit ?? null,
        variants: byKey.get(key) ?? [],
      };
    }),
  };
}

/** Paginated table listing. Simple regex filter for now; replaced by Atlas Search later. */
export async function listMedicines({ q, type, sort, page }: MedicineListQuery): Promise<MedicineList> {
  await connectDB();

  const filter: QueryFilter<MedicineDoc> = {};
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ brand: rx }, { genericName: rx }];
  }
  if (type !== "all") filter.type = type;
  if (sort !== "brand") filter.unitPrice = { $ne: null }; // no-price rows would sort first/last otherwise

  const total = await Medicine.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / MEDICINE_PAGE_SIZE));
  const current = Math.min(page, pages);

  const docs = await Medicine.find(filter)
    .sort(SORTS[sort])
    .skip((current - 1) * MEDICINE_PAGE_SIZE)
    .limit(MEDICINE_PAGE_SIZE)
    .select("slug brand type strength dosageForm genericName manufacturerName unitPrice priceLabel")
    .lean();

  return {
    total,
    page: current,
    pages,
    rows: docs.map((d) => ({
      id: String(d._id),
      slug: d.slug,
      brand: d.brand,
      type: d.type ?? "allopathic",
      strength: d.strength ?? null,
      dosageForm: d.dosageForm,
      genericName: d.genericName ?? null,
      manufacturerName: d.manufacturerName ?? null,
      unitPrice: d.unitPrice ?? null,
      priceLabel: d.priceLabel ?? null,
    })),
  };
}
