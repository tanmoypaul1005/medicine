import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Generic, Medicine, type GenericSection } from "@/models";

type Pack = { label: string; price: number; qty?: number; qtyPrice?: number };

export type AltRow = {
  slug: string;
  brand: string;
  manufacturerName: string | null;
  unitPrice: number;
  priceLabel: string | null; // null = per unit; else cheapest pack label ("100 ml bottle")
};

export type MedicineDetail = {
  slug: string;
  brand: string;
  type: "allopathic" | "herbal";
  strength: string | null;
  dosageForm: string;
  manufacturerName: string | null;
  unitPrice: number | null;
  priceLabel: string | null;
  packs: Pack[];
  generic: {
    name: string;
    slug: string;
    drugClass: string | null;
    pregnancyCategory: string | null;
    monographUrl: string | null;
    sections: Partial<Record<GenericSection, string>>;
  } | null;
  genericNameRaw: string | null; // when no generic doc is linked
  alternatives: AltRow[]; // same generic + strength + form, cheapest first, excluding self
  alternativesTotal: number;
  variants: { slug: string; strength: string | null; dosageForm: string; unitPrice: number | null }[]; // same brand + maker
};

const ALT_LIMIT = 15;

const priceLabelOf = (packs: { label: string; price: number }[] | undefined | null): string | null => {
  if (!packs?.length || packs.some((p) => p.label === "unit")) return null;
  return [...packs].sort((a, b) => a.price - b.price)[0].label;
};

/** Cached per slug (hours). Revalidate after admin edits with revalidateTag(`medicine:${slug}`). */
export async function getMedicineDetail(slug: string): Promise<MedicineDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`medicine:${slug}`);

  await connectDB();
  const m = await Medicine.findOne({ slug })
    .select("slug brand type strength dosageForm formSlug genericId genericName manufacturerId manufacturerName unitPrice packs")
    .lean();
  if (!m) return null;

  const altFilter = {
    genericId: m.genericId,
    strength: m.strength ?? null,
    formSlug: m.formSlug,
    slug: { $ne: m.slug },
    unitPrice: { $ne: null },
  };

  const [generic, alts, alternativesTotal, variants] = await Promise.all([
    m.genericId
      ? Generic.findById(m.genericId).select("name slug drugClass pregnancyCategory monographUrl sections").lean()
      : null,
    m.genericId
      ? Medicine.find(altFilter)
          .sort({ unitPrice: 1, brand: 1 })
          .limit(ALT_LIMIT)
          .select("slug brand manufacturerName unitPrice packs")
          .lean()
      : [],
    m.genericId ? Medicine.countDocuments(altFilter) : 0,
    Medicine.find({ brand: m.brand, manufacturerId: m.manufacturerId as Types.ObjectId, slug: { $ne: m.slug } })
      .sort({ dosageForm: 1, strength: 1 })
      .limit(20)
      .select("slug strength dosageForm unitPrice")
      .lean(),
  ]);

  return {
    slug: m.slug,
    brand: m.brand,
    type: m.type ?? "allopathic",
    strength: m.strength ?? null,
    dosageForm: m.dosageForm,
    manufacturerName: m.manufacturerName ?? null,
    unitPrice: m.unitPrice ?? null,
    priceLabel: priceLabelOf(m.packs),
    packs: (m.packs ?? []).map((p) => ({ label: p.label, price: p.price, qty: p.qty ?? undefined, qtyPrice: p.qtyPrice ?? undefined })),
    generic: generic
      ? {
          name: generic.name,
          slug: generic.slug,
          drugClass: generic.drugClass ?? null,
          pregnancyCategory: generic.pregnancyCategory ?? null,
          monographUrl: generic.monographUrl ?? null,
          sections: Object.fromEntries(
            Object.entries(generic.sections ?? {}).filter(([, v]) => typeof v === "string" && v)
          ) as Partial<Record<GenericSection, string>>,
        }
      : null,
    genericNameRaw: m.genericName ?? null,
    alternatives: alts.map((a) => ({
      slug: a.slug,
      brand: a.brand,
      manufacturerName: a.manufacturerName ?? null,
      unitPrice: a.unitPrice as number,
      priceLabel: priceLabelOf(a.packs),
    })),
    alternativesTotal,
    variants: variants.map((v) => ({
      slug: v.slug,
      strength: v.strength ?? null,
      dosageForm: v.dosageForm,
      unitPrice: v.unitPrice ?? null,
    })),
  };
}
