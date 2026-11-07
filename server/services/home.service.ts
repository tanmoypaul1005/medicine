import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connectDB } from "@/lib/db";
import { Generic, Interaction, Manufacturer, Medicine } from "@/models";

// Featured medicines on the home page (verified slugs). Everything else is computed from the DB.
const FEATURED = [
  "napa-500-mg-tablet",
  "seclo-20-mg-capsule-delayed-release",
  "fexo-120-mg-tablet",
  "monas-10-mg-tablet",
  "sergel-20-mg-capsule-delayed-release",
  "alatrol-10-mg-tablet",
];

type PriceRef = { slug: string; brand: string; unitPrice: number };

export type HomeData = {
  stats: { medicines: number; generics: number; manufacturers: number; interactions: number };
  popular: {
    slug: string;
    brand: string;
    strength: string | null;
    dosageForm: string;
    genericName: string | null;
    unitPrice: number | null;
    priceLabel: string | null;
    brandCount: number; // brands with the same generic + strength + form
  }[];
  savings: {
    genericName: string;
    strength: string | null;
    dosageForm: string;
    cheap: PriceRef;
    expensive: PriceRef;
    brandCount: number;
    pct: number; // cheapest vs most expensive, % less
  }[];
};

export async function getHomeData(): Promise<HomeData> {
  "use cache";
  cacheLife("hours");
  cacheTag("medicines", "home");
  await connectDB();

  const [medicines, generics, manufacturers, interactions, featured] = await Promise.all([
    Medicine.estimatedDocumentCount(),
    Generic.estimatedDocumentCount(),
    Manufacturer.estimatedDocumentCount(),
    Interaction.estimatedDocumentCount(),
    Medicine.find({ slug: { $in: FEATURED } })
      .select("slug brand strength dosageForm formSlug genericId genericName unitPrice priceLabel")
      .lean(),
  ]);
  const bySlug = new Map(featured.map((m) => [m.slug, m]));

  const groups = await Promise.all(
    FEATURED.map(async (slug) => {
      const m = bySlug.get(slug);
      if (!m) return null;
      // Same generic + strength + form, per-unit prices only (comparable)
      const peers = m.genericId
        ? await Medicine.find({ genericId: m.genericId, strength: m.strength, formSlug: m.formSlug, priceLabel: null, unitPrice: { $gt: 0 } })
            .select("slug brand unitPrice")
            .sort({ unitPrice: 1 })
            .lean()
        : [];
      return { m, peers };
    })
  );

  const popular: HomeData["popular"] = [];
  const savings: HomeData["savings"] = [];
  for (const g of groups) {
    if (!g) continue;
    const { m, peers } = g;
    popular.push({
      slug: m.slug,
      brand: m.brand,
      strength: m.strength ?? null,
      dosageForm: m.dosageForm,
      genericName: m.genericName ?? null,
      unitPrice: m.unitPrice ?? null,
      priceLabel: m.priceLabel ?? null,
      brandCount: Math.max(peers.length, 1),
    });
    if (peers.length >= 3) {
      const cheap = peers[0];
      const expensive = peers[peers.length - 1];
      const pct = Math.round(((expensive.unitPrice! - cheap.unitPrice!) / expensive.unitPrice!) * 100);
      if (pct > 0) {
        savings.push({
          genericName: m.genericName ?? m.brand,
          strength: m.strength ?? null,
          dosageForm: m.dosageForm,
          cheap: { slug: cheap.slug, brand: cheap.brand, unitPrice: cheap.unitPrice! },
          expensive: { slug: expensive.slug, brand: expensive.brand, unitPrice: expensive.unitPrice! },
          brandCount: peers.length,
          pct,
        });
      }
    }
  }
  savings.sort((a, b) => b.pct - a.pct);

  return { stats: { medicines, generics, manufacturers, interactions }, popular, savings: savings.slice(0, 4) };
}
