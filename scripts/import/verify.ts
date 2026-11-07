/** npm run db:verify — DB vs CSV counts, orphans, sample alternatives query. Read-only. */
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Generic, Manufacturer, Medicine } from "@/models";
import { loadCsv } from "./lib/csv";

let failed = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`${ok ? "✔" : "✘"} ${msg}`);
  if (!ok) failed++;
};

async function main() {
  await connectDB();

  const csv = {
    manufacturers: loadCsv("manufacturer").length,
    generics: loadCsv("generic").length,
    medicines: loadCsv("medicine").length,
  };
  const db = {
    manufacturers: await Manufacturer.countDocuments({ sourceId: { $exists: true } }),
    generics: await Generic.countDocuments({ sourceId: { $exists: true } }),
    medicines: await Medicine.countDocuments({ sourceId: { $exists: true } }),
  };
  for (const k of Object.keys(csv) as (keyof typeof csv)[]) {
    check(db[k] >= csv[k], `${k}: db ${db[k]} / csv ${csv[k]}${db[k] > csv[k] ? " (extra docs not in CSV)" : ""}`);
  }

  const noGeneric = await Medicine.countDocuments({ genericId: null });
  const noMfr = await Medicine.countDocuments({ manufacturerId: null });
  const noPrice = await Medicine.countDocuments({ unitPrice: null });
  check(noGeneric <= 5, `medicines without generic: ${noGeneric}`);
  check(noMfr === 0, `medicines without manufacturer: ${noMfr}`);
  check(noPrice < 200, `medicines without price: ${noPrice}`);
  check((await Generic.countDocuments({ brandCount: { $gt: 0 } })) > 0, "generic brandCount populated");

  const napa = await Medicine.findOne({ slug: "napa-500-mg-tablet" })
    .select("brand strength dosageForm formSlug unitPrice genericId genericName manufacturerName")
    .lean();
  check(!!napa, `sample napa-500-mg-tablet: ${napa ? `${napa.genericName}, ${napa.manufacturerName}, ৳${napa.unitPrice}` : "missing"}`);

  if (napa?.genericId) {
    const t = Date.now();
    const alts = await Medicine.find({
      genericId: napa.genericId,
      strength: napa.strength,
      formSlug: napa.formSlug,
      unitPrice: { $ne: null },
    })
      .sort({ unitPrice: 1 })
      .limit(5)
      .select("brand unitPrice manufacturerName")
      .lean();
    check(alts.length > 1, `alternatives (${Date.now() - t}ms): ${alts.map((a) => `${a.brand} ৳${a.unitPrice}`).join(", ")}`);
  }

  const idx = await Medicine.collection.indexes();
  check(
    idx.some((i) => i.key.genericId === 1 && i.key.formSlug === 1),
    `alternatives index present (${idx.length} indexes)`
  );

  console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
  process.exitCode = failed ? 1 : 0;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
