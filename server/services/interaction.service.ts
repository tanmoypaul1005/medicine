import "server-only";
import { connectDB } from "@/lib/db";
import { ingredientsOf, pairKey, type Ingredient } from "@/lib/ingredients";
import { Interaction, Medicine } from "@/models";

export type CheckItem = {
  slug: string;
  brand: string;
  strength: string | null;
  dosageForm: string;
  genericName: string | null;
  ingredients: Ingredient[];
};

export type Finding = {
  kind: "duplicate" | "warning" | "caution";
  a: string; // ingredient display names
  b: string;
  evidence: { genericName: string; genericSlug: string; text: string; via?: string }[];
};

/** One row per pair of selected medicines. findings = [] → "no information" (never "safe"). */
export type PairResult = { a: CheckItem; b: CheckItem; level: Finding["kind"] | "none"; findings: Finding[] };

export type CheckResult = {
  items: CheckItem[];
  missing: string[]; // slugs not found
  pairs: PairResult[];
  counts: Record<PairResult["level"], number>;
};

const RANK: Record<PairResult["level"], number> = { duplicate: 0, warning: 1, caution: 2, none: 3 };
const related = (x: string, y: string) => x === y || x.startsWith(`${y} `) || y.startsWith(`${x} `);

export async function checkInteractions(slugs: string[]): Promise<CheckResult> {
  await connectDB();
  const docs = await Medicine.find({ slug: { $in: slugs } })
    .select("slug brand strength dosageForm genericName")
    .lean();
  const bySlug = new Map(docs.map((d) => [d.slug, d]));
  const items: CheckItem[] = slugs.flatMap((s) => {
    const d = bySlug.get(s);
    return d
      ? [{
          slug: d.slug,
          brand: d.brand,
          strength: d.strength ?? null,
          dosageForm: d.dosageForm,
          genericName: d.genericName ?? null,
          ingredients: ingredientsOf(d.genericName),
        }]
      : [];
  });
  const missing = slugs.filter((s) => !bySlug.has(s));

  // Collect every ingredient pair across different medicines, then one DB query.
  const keys = new Set<string>();
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++)
      for (const x of items[i].ingredients)
        for (const y of items[j].ingredients) if (!related(x.key, y.key)) keys.add(pairKey(x.key, y.key));

  const found = keys.size
    ? await Interaction.find({ pairKey: { $in: [...keys] } }).select("pairKey severity evidence").lean()
    : [];
  const byKey = new Map(found.map((f) => [f.pairKey, f]));

  const pairs: PairResult[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const findings: Finding[] = [];
      for (const x of items[i].ingredients) {
        for (const y of items[j].ingredients) {
          if (related(x.key, y.key)) {
            findings.push({ kind: "duplicate", a: x.name, b: y.name, evidence: [] });
            continue;
          }
          const f = byKey.get(pairKey(x.key, y.key));
          if (f) {
            findings.push({
              kind: f.severity,
              a: x.name,
              b: y.name,
              evidence: f.evidence.map((e) => ({
                genericName: e.genericName,
                genericSlug: e.genericSlug,
                text: e.text,
                ...(e.via ? { via: e.via } : {}),
              })),
            });
          }
        }
      }
      findings.sort((p, q) => RANK[p.kind] - RANK[q.kind]);
      pairs.push({ a: items[i], b: items[j], level: findings[0]?.kind ?? "none", findings });
    }
  }
  pairs.sort((p, q) => RANK[p.level] - RANK[q.level]);

  const counts = { duplicate: 0, warning: 0, caution: 0, none: 0 };
  for (const p of pairs) counts[p.level]++;
  return { items, missing, pairs, counts };
}
