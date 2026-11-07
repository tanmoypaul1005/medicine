/**
 * Build the `conditions` collection from scripts/import/lib/conditionCatalog.ts + label indication text.
 *   npm run db:conditions:dry   report only
 *   npm run db:conditions       upsert all catalog conditions (keeps `reviewed`), remove ones no longer in the catalog
 * A generic is listed for a condition only if ALL its ingredients are in the condition's OTC allow-list,
 * its label's indication section mentions the condition, and at least one brand exists in an allowed form.
 */
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { ingredientsOf } from "@/lib/ingredients";
import { Condition, Generic, Medicine } from "@/models";
import { ALWAYS_EXCLUDED_FORMS, CONDITION_CATALOG } from "./lib/conditionCatalog";
import { htmlSentences } from "./lib/transform";
import { revalidateTags } from "../lib/revalidate";

const DRY = process.argv.includes("--dry");

async function main() {
  const t0 = Date.now();
  await connectDB();
  const generics = await Generic.find().select("name slug sections.indication").lean();
  const allKeys = new Set(generics.flatMap((g) => ingredientsOf(g.name).map((i) => i.key)));
  const forms = await Medicine.aggregate<{ _id: mongoose.Types.ObjectId; forms: string[] }>([
    { $match: { genericId: { $ne: null } } },
    { $group: { _id: "$genericId", forms: { $addToSet: "$dosageForm" } } },
  ]);
  const formsByGeneric = new Map(forms.map((f) => [String(f._id), f.forms]));

  const docs = CONDITION_CATALOG.map((c, order) => {
    const missing = c.allow.filter((k) => !allKeys.has(k));
    if (missing.length) console.log(`  [${c.slug}] allow-list not in data: ${missing.join(", ")}`);
    const allow = new Set(c.allow);

    const picked = generics.flatMap((g) => {
      const ings = ingredientsOf(g.name);
      if (!ings.length || !ings.every((i) => allow.has(i.key))) return [];
      const html = g.sections?.indication;
      const evidence = html ? htmlSentences(html).find((s) => c.terms.test(s)) : undefined;
      if (!evidence) return [];
      const okForms = (formsByGeneric.get(String(g._id)) ?? []).filter((f) => c.forms.test(f) && !ALWAYS_EXCLUDED_FORMS.test(f));
      if (!okForms.length) return [];
      return [{ genericId: g._id, name: g.name, slug: g.slug, evidence }];
    });

    return {
      slug: c.slug,
      order,
      icon: c.icon,
      nameBn: c.nameBn,
      nameEn: c.nameEn,
      aliases: [...new Set(c.aliases.map((a) => a.toLowerCase()))],
      summaryBn: c.summaryBn,
      summaryEn: c.summaryEn,
      redFlagsBn: c.redFlagsBn,
      redFlagsEn: c.redFlagsEn,
      formPattern: c.forms.source,
      generics: picked,
    };
  });

  for (const d of docs) console.log(`${d.slug.padEnd(16)} ${String(d.generics.length).padStart(2)} generics: ${d.generics.map((g) => g.name).join(" | ")}`);
  const empty = docs.filter((d) => !d.generics.length).map((d) => d.slug);
  if (empty.length) console.log(`⚠ no generics: ${empty.join(", ")}`);

  if (DRY) {
    console.log(`Dry run done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    return;
  }
  await Condition.syncIndexes();
  for (const d of docs) {
    await Condition.updateOne({ slug: d.slug }, { $set: d, $setOnInsert: { reviewed: false } }, { upsert: true });
  }
  const removed = await Condition.deleteMany({ slug: { $nin: docs.map((d) => d.slug) } });
  console.log(`Upserted ${docs.length} conditions, removed ${removed.deletedCount} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await revalidateTags(["conditions"]);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
