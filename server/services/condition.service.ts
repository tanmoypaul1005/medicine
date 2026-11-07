import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { ALWAYS_EXCLUDED_FORMS } from "@/lib/conditions";
import { connectDB } from "@/lib/db";
import { Condition, Medicine } from "@/models";

export type ConditionCard = {
  slug: string;
  icon: string;
  nameBn: string;
  nameEn: string;
  summaryBn: string;
  summaryEn: string;
  aliases: string[];
  genericCount: number;
};

export type ConditionBrand = { slug: string; brand: string; strength: string | null; dosageForm: string; unitPrice: number };

export type ConditionDetail = Omit<ConditionCard, "aliases" | "genericCount"> & {
  redFlagsBn: string[];
  redFlagsEn: string[];
  reviewed: boolean;
  generics: { name: string; slug: string; evidence: string; brands: ConditionBrand[]; brandTotal: number }[];
};

const BRANDS_PER_GENERIC = 5;

/** All conditions for the list page, home chips and search matching. */
export async function listConditions(): Promise<ConditionCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("conditions");
  await connectDB();
  const docs = await Condition.find()
    .sort({ order: 1 })
    .select("slug icon nameBn nameEn summaryBn summaryEn aliases generics.name")
    .lean();
  return docs.map((d) => ({
    slug: d.slug,
    icon: d.icon ?? "pill",
    nameBn: d.nameBn,
    nameEn: d.nameEn,
    summaryBn: d.summaryBn,
    summaryEn: d.summaryEn,
    aliases: d.aliases ?? [],
    genericCount: d.generics?.length ?? 0,
  }));
}

/** Conditions whose name/alias matches a search query ("জ্বর", "fever", "gastric"). */
export async function findConditions(q: string): Promise<ConditionCard[]> {
  const term = q.normalize("NFC").trim().toLowerCase();
  if (term.length < 2) return [];
  const all = await listConditions();
  // Whole-word containment ("জ্বর হয়েছে" → জ্বর) but not substrings ("gastric" must not match "gas")
  const padded = ` ${term} `;
  return all.filter((c) =>
    [c.nameBn, c.nameEn.toLowerCase(), ...c.aliases].some((a) => a === term || a.startsWith(term) || padded.includes(` ${a} `))
  );
}

export async function getCondition(slug: string): Promise<ConditionDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("conditions", `condition:${slug}`);
  await connectDB();
  const c = await Condition.findOne({ slug }).lean();
  if (!c) return null;
  const allowed = new RegExp(c.formPattern, "i");

  const generics = await Promise.all(
    (c.generics ?? []).map(async (g) => {
      const meds = await Medicine.find({ genericId: g.genericId, unitPrice: { $ne: null } })
        .select("slug brand strength dosageForm unitPrice")
        .sort({ unitPrice: 1 })
        .lean();
      const ok = meds.filter((m) => allowed.test(m.dosageForm) && !ALWAYS_EXCLUDED_FORMS.test(m.dosageForm));
      const seen = new Set<string>();
      const brands: ConditionBrand[] = [];
      for (const m of ok) {
        if (seen.has(m.brand) || brands.length >= BRANDS_PER_GENERIC) continue;
        seen.add(m.brand);
        brands.push({ slug: m.slug, brand: m.brand, strength: m.strength ?? null, dosageForm: m.dosageForm, unitPrice: m.unitPrice as number });
      }
      return { name: g.name, slug: g.slug, evidence: g.evidence, brands, brandTotal: new Set(ok.map((m) => m.brand)).size };
    })
  );

  return {
    slug: c.slug,
    icon: c.icon ?? "pill",
    nameBn: c.nameBn,
    nameEn: c.nameEn,
    summaryBn: c.summaryBn,
    summaryEn: c.summaryEn,
    redFlagsBn: c.redFlagsBn ?? [],
    redFlagsEn: c.redFlagsEn ?? [],
    reviewed: c.reviewed ?? false,
    generics: generics.filter((g) => g.brands.length > 0),
  };
}
