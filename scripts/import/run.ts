/**
 * CSV (data/raw) → MongoDB. Idempotent: upserts by sourceId; never deletes.
 *   npm run db:import:dry   parse + validate + report, no DB writes
 *   npm run db:import       write (manufacturers → generics → medicines → counts)
 */
import mongoose, { type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { Generic, GENERIC_SECTIONS, Manufacturer, Medicine, MEDICINE_TYPES, type GenericSection } from "@/models";
import { loadCsv } from "./lib/csv";
import { assignSlugs, cleanHtml, key, parsePregnancyCategory, parsePrice } from "./lib/transform";

const DRY = process.argv.includes("--dry");
const CHUNK = 1000;

const SECTION_COLS: Record<GenericSection, string> = {
  indication: "indication description",
  therapeuticClass: "therapeutic class description",
  pharmacology: "pharmacology description",
  dosage: "dosage description",
  administration: "administration description",
  interaction: "interaction description",
  contraindications: "contraindications description",
  sideEffects: "side effects description",
  pregnancyLactation: "pregnancy and lactation description",
  precautions: "precautions description",
  pediatric: "pediatric usage description",
  overdose: "overdose effects description",
  duration: "duration of treatment description",
  reconstitution: "reconstitution description",
  storage: "storage conditions description",
};

const log = (...a: unknown[]) => console.log(...a);
const errors: string[] = [];

// ---------- Build docs (pure, no DB) ----------
function buildManufacturers() {
  const rows = loadCsv("manufacturer").map((r) => ({ sourceId: r["manufacturer id"], name: r["manufacturer name"] }));
  const slugs = assignSlugs(rows, (r) => r.name);
  return rows.map((r) => ({ ...r, slug: slugs.get(r.sourceId)! }));
}

function buildGenerics() {
  const rows = loadCsv("generic").map((r) => ({ sourceId: r["generic id"], r }));
  const slugs = assignSlugs(rows, (x) => x.r["generic name"]);
  return rows.map(({ sourceId, r }) => {
    const sections: Partial<Record<GenericSection, string>> = {};
    for (const k of GENERIC_SECTIONS) {
      const html = cleanHtml(r[SECTION_COLS[k]]);
      if (html) sections[k] = html;
    }
    return {
      sourceId,
      name: r["generic name"],
      slug: slugs.get(sourceId)!,
      drugClass: r["drug class"] || undefined,
      pregnancyCategory: parsePregnancyCategory(sections.pregnancyLactation),
      sections,
      monographUrl: r["monograph link"] || undefined,
    };
  });
}

function buildMedicines(genericIds: Map<string, Types.ObjectId | null>, mfrIds: Map<string, Types.ObjectId | null>) {
  const rows = loadCsv("medicine").map((r) => ({ sourceId: r["brand id"], r }));
  const slugs = assignSlugs(rows, ({ r }) => `${r["brand name"]} ${r.strength} ${r["dosage form"]}`);
  const stats = { unit: 0, packOnly: 0, noPrice: 0, unparsed: [] as string[], noGeneric: [] as string[] };

  const docs = rows.map(({ sourceId, r }) => {
    const priceText = r["package container"];
    const { unitPrice, packs } = parsePrice(priceText);
    if (packs.some((p) => p.label === "unit")) stats.unit++;
    else if (packs.length) stats.packOnly++;
    else stats.noPrice++;
    if (priceText.includes("৳") && !packs.length) stats.unparsed.push(`${sourceId}: ${priceText}`);

    const gName = r.generic;
    if (!gName || !genericIds.has(key(gName))) stats.noGeneric.push(`${sourceId} ${r["brand name"]} "${gName}"`);
    const type = MEDICINE_TYPES.find((t) => t === r.type) ?? "allopathic";

    return {
      sourceId,
      brand: r["brand name"],
      slug: slugs.get(sourceId)!,
      type,
      genericId: genericIds.get(key(gName)) ?? null,
      genericName: gName || undefined,
      strength: r.strength || undefined,
      dosageForm: r["dosage form"],
      formSlug: slugify(r["dosage form"]),
      manufacturerId: mfrIds.get(key(r.manufacturer)) ?? null,
      manufacturerName: r.manufacturer || undefined,
      unitPrice,
      packs,
      priceText: priceText || undefined,
    };
  });
  return { docs, stats };
}

// ---------- Validate / write ----------
async function validate<T>(model: Model<T>, docs: object[], label: string) {
  let bad = 0;
  for (const d of docs) {
    try {
      await new model(d).validate();
    } catch (err) {
      bad++;
      if (errors.length < 20) errors.push(`${label} ${(d as { sourceId: string }).sourceId}: ${(err as Error).message}`);
    }
  }
  log(`  ${label}: ${docs.length} docs, ${bad} invalid`);
  return bad;
}

async function upsertAll<T>(model: Model<T>, docs: { sourceId: string }[], label: string) {
  let ins = 0, mod = 0;
  for (let i = 0; i < docs.length; i += CHUNK) {
    const ops = docs.slice(i, i + CHUNK).map((d) => ({
      updateOne: { filter: { sourceId: d.sourceId }, update: { $set: d }, upsert: true },
    }));
    const res = await model.bulkWrite(ops as Parameters<typeof model.bulkWrite>[0], { ordered: false });
    ins += res.upsertedCount;
    mod += res.modifiedCount;
    process.stdout.write(`\r  ${label}: ${Math.min(i + CHUNK, docs.length)}/${docs.length}`);
  }
  log(`\r  ${label}: ${docs.length} done (inserted ${ins}, updated ${mod})`);
}

async function idMap(model: Model<{ name: string }>): Promise<Map<string, Types.ObjectId | null>> {
  const rows = await model.find({}, { name: 1 }).lean();
  return new Map(rows.map((r) => [key(r.name), r._id as Types.ObjectId]));
}

async function updateCounts() {
  for (const [model, field] of [
    [Generic, "$genericId"],
    [Manufacturer, "$manufacturerId"],
  ] as const) {
    const counts = await Medicine.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $match: { [field.slice(1)]: { $ne: null } } },
      { $group: { _id: field, n: { $sum: 1 } } },
    ]);
    await (model as Model<unknown>).updateMany({}, { $set: { brandCount: 0 } });
    await (model as Model<unknown>).bulkWrite(
      counts.map((c) => ({ updateOne: { filter: { _id: c._id }, update: { $set: { brandCount: c.n } } } }))
    );
  }
  log("  brandCount updated");
}

async function main() {
  const t0 = Date.now();
  log(DRY ? "DRY RUN (no writes)" : "IMPORT");

  log("1. Parse");
  const mfrs = buildManufacturers();
  const gens = buildGenerics();
  log(`  manufacturers ${mfrs.length}, generics ${gens.length} (pregnancy cat ${gens.filter((g) => g.pregnancyCategory).length})`);

  // In dry mode use placeholder ids so joins can be checked without a DB.
  const fakeIds = <T extends { name: string }>(xs: T[]) => new Map(xs.map((x) => [key(x.name), new mongoose.Types.ObjectId()]));
  let mfrIds: Map<string, Types.ObjectId | null> = fakeIds(mfrs);
  let genIds: Map<string, Types.ObjectId | null> = fakeIds(gens);
  const preview = buildMedicines(genIds, mfrIds);

  const s = preview.stats;
  log(`  medicines ${preview.docs.length}: unitPrice ${s.unit}, pack-only ${s.packOnly}, no price ${s.noPrice}`);
  log(`  unparsed prices: ${s.unparsed.length}`, s.unparsed.slice(0, 5));
  log(`  no generic match: ${s.noGeneric.length}`, s.noGeneric.slice(0, 5));

  log("2. Validate");
  const bad =
    (await validate(Manufacturer, mfrs, "manufacturers")) +
    (await validate(Generic, gens, "generics")) +
    (await validate(Medicine, preview.docs, "medicines"));
  if (bad) {
    log("Validation errors (first 20):\n " + errors.join("\n "));
    process.exitCode = 1;
    return;
  }

  const sample = preview.docs.find((d) => d.slug === "napa-500-mg-tablet") ?? preview.docs[0];
  log("  sample:", JSON.stringify({ ...sample, genericId: "…", manufacturerId: "…" }));

  if (DRY) {
    log(`Dry run OK in ${((Date.now() - t0) / 1000).toFixed(1)}s. Run "npm run db:import" to write.`);
    return;
  }

  log("3. Write");
  await connectDB();
  await Promise.all([Manufacturer.syncIndexes(), Generic.syncIndexes(), Medicine.syncIndexes()]);
  await upsertAll(Manufacturer, mfrs, "manufacturers");
  await upsertAll(Generic, gens, "generics");
  mfrIds = await idMap(Manufacturer as unknown as Model<{ name: string }>);
  genIds = await idMap(Generic as unknown as Model<{ name: string }>);
  const { docs } = buildMedicines(genIds, mfrIds);
  await upsertAll(Medicine, docs, "medicines");
  await updateCounts();
  log(`Import done in ${((Date.now() - t0) / 1000).toFixed(1)}s. Run "npm run db:verify".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
