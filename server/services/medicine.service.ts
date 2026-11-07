import "server-only";
import type { QueryFilter, SortOrder } from "mongoose";
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
};

export type MedicineList = { rows: MedicineRow[]; total: number; page: number; pages: number };

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SORTS: Record<MedicineListQuery["sort"], Record<string, SortOrder>> = {
  brand: { brand: 1, strength: 1, _id: 1 },
  "price-asc": { unitPrice: 1, _id: 1 },
  "price-desc": { unitPrice: -1, _id: 1 },
};

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
    .select("slug brand type strength dosageForm genericName manufacturerName unitPrice")
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
    })),
  };
}
