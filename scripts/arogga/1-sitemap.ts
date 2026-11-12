/** npm run images:sitemap — list arogga product URLs from their sitemaps → data/arogga/products.json. No DB access. */
import fs from "node:fs";
import { DATA_DIR, PRODUCTS_FILE, fetchText, sleep, type AroggaProduct } from "./lib";

const INDEX = "https://www.arogga.com/sitemap.xml";
const PRODUCT_URL = /https:\/\/www\.arogga\.com\/product\/(\d+)\/([^<\s]+)/g;

async function main() {
  const index = await fetchText(INDEX);
  // Product sitemaps are the numbered ones (/sitemap/0.xml …); lab/doctor sitemaps are skipped.
  const parts = [...index.matchAll(/https:\/\/www\.arogga\.com\/sitemap\/\d+\.xml/g)].map((m) => m[0]);
  if (!parts.length) throw new Error("No product sitemaps found in the sitemap index");

  const byId = new Map<string, AroggaProduct>();
  for (const url of parts) {
    await sleep(1000);
    const xml = await fetchText(url);
    let n = 0;
    for (const m of xml.matchAll(PRODUCT_URL)) {
      byId.set(m[1], { id: m[1], slug: decodeURIComponent(m[2]), url: m[0] });
      n++;
    }
    console.log(`${url} → ${n} products`);
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify([...byId.values()]));
  console.log(`\n${byId.size} products → ${PRODUCTS_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
