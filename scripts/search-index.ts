/** npm run db:search-index — create/update the Atlas Search index and wait until it's queryable. */
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Medicine, MEDICINE_SEARCH_DEFINITION, MEDICINE_SEARCH_INDEX } from "@/models";

async function main() {
  await connectDB();
  const col = Medicine.collection;
  const existing = (await col.listSearchIndexes(MEDICINE_SEARCH_INDEX).toArray())[0];

  if (existing) {
    await col.updateSearchIndex(MEDICINE_SEARCH_INDEX, MEDICINE_SEARCH_DEFINITION);
    console.log(`Updating "${MEDICINE_SEARCH_INDEX}"…`);
  } else {
    await col.createSearchIndex({ name: MEDICINE_SEARCH_INDEX, definition: MEDICINE_SEARCH_DEFINITION });
    console.log(`Creating "${MEDICINE_SEARCH_INDEX}"…`);
  }

  const deadline = Date.now() + 10 * 60_000;
  // Poll until the new definition is queryable (initial build of ~22k docs takes ~1 min).
  for (;;) {
    const [idx] = (await col.listSearchIndexes(MEDICINE_SEARCH_INDEX).toArray()) as {
      status?: string;
      queryable?: boolean;
    }[];
    process.stdout.write(`\r  status: ${idx?.status ?? "?"}, queryable: ${idx?.queryable}   `);
    if (idx?.queryable && idx.status === "READY") break;
    if (idx?.status === "FAILED") throw new Error(`Index build failed: ${JSON.stringify(idx)}`);
    if (Date.now() > deadline) throw new Error("Timed out waiting for search index");
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.log("\nSearch index ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
