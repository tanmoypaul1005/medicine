/**
 * npm run db:sync-dgda — download the DGDA registered-drug list (public DGHS OCL API, read-only there)
 * into the `dgdadrugs` collection. Touches ONLY that collection. Safe to re-run: upserts by concept id,
 * then removes entries no longer in the registry. Afterwards: POST /api/revalidate {"tags":["dgda"]}.
 */
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { brandKey, companyKey, darKey, DGDA_API, firstNumber } from "@/lib/dgda";
import { DgdaDrug } from "@/models";

type Concept = {
  id: string;
  display_name: string;
  retired?: boolean;
  updated_on?: string;
  extras?: { company?: string; dar_number?: string; trade_name?: string; dosage_form?: string; dar_quality_flag?: string; generic_content_raw?: string };
};

const PAGE = 1000;

async function fetchPage(page: number): Promise<{ items: Concept[]; total: number }> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${DGDA_API}/concepts/?limit=${PAGE}&page=${page}&verbose=true`, {
        headers: { Accept: "application/json", "User-Agent": "MedicineMate-sync" },
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { items: (await res.json()) as Concept[], total: Number(res.headers.get("num_found") ?? 0) };
    } catch (e) {
      if (attempt >= 4) throw e;
      console.warn(`\n  page ${page} failed (${(e as Error).message}), retry ${attempt}…`);
      await new Promise((r) => setTimeout(r, attempt * 5000));
    }
  }
}

async function main() {
  await connectDB();
  await DgdaDrug.init(); // ensure indexes
  const syncedAt = new Date();
  let page = 1;
  let seen = 0;
  let total = Infinity;

  while (seen < total) {
    const { items, total: t } = await fetchPage(page);
    total = t || total;
    if (!items.length) break;
    const ops = items
      .filter((c) => !c.retired)
      .map((c) => {
        const x = c.extras ?? {};
        const tradeName = (x.trade_name || c.display_name || "").trim();
        const doc = {
          conceptId: c.id,
          darNumber: x.dar_number?.trim() || null,
          darKey: x.dar_number ? darKey(x.dar_number) || null : null,
          darFlag: x.dar_quality_flag || null,
          tradeName,
          brandKey: brandKey(tradeName),
          company: x.company?.trim() || null,
          companyKey: x.company ? companyKey(x.company) : null,
          dosageForm: x.dosage_form?.trim() || null,
          genericContent: x.generic_content_raw?.replace(/\s+/g, " ").trim() || null,
          strengthNum: firstNumber(x.generic_content_raw),
          sourceUpdatedAt: c.updated_on ? new Date(c.updated_on) : null,
          syncedAt,
        };
        return { updateOne: { filter: { conceptId: c.id }, update: { $set: doc }, upsert: true } };
      })
      .filter((op) => op.updateOne.update.$set.brandKey);
    if (ops.length) await DgdaDrug.bulkWrite(ops, { ordered: false });
    seen += items.length;
    process.stdout.write(`\r  page ${page}: ${seen}/${total}   `);
    page++;
  }

  if (seen < total * 0.9) throw new Error(`Only ${seen}/${total} fetched — keeping old entries`);
  const { deletedCount } = await DgdaDrug.deleteMany({ syncedAt: { $lt: syncedAt } });
  console.log(`\nDone: ${await DgdaDrug.estimatedDocumentCount()} entries, ${deletedCount} removed.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
