/**
 * npm run images:match [-- --limit=100 | --all] — DRY RUN, never writes to the DB.
 * Matches our medicines to arogga products (brand + strength + form), fetches the product page of the
 * first `limit` sure matches (1 request/second, most common generics first) and writes data/arogga/report.csv.
 * Re-running resumes: fetched pages are remembered in data/arogga/images.json.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Generic, Medicine } from "@/models";
import {
  IMAGE_CACHE_FILE,
  PRODUCTS_FILE,
  REPORT_FILE,
  csvCell,
  extractImage,
  fetchBuffer,
  fetchText,
  indexProducts,
  matchMedicine,
  placeholderHashes,
  sleep,
  type AroggaProduct,
  type MatchStatus,
} from "./lib";

type ImageCache = Record<string, { imageUrl: string | null; placeholder: boolean; hash?: string }>; // key = arogga product id
type Row = {
  slug: string;
  brand: string;
  strength: string | null;
  dosageForm: string;
  status: MatchStatus | "placeholder" | "pending";
  score: number;
  aroggaUrl: string;
  aroggaId: string;
  imageUrl: string;
  imageHash: string;
  rank: number;
};

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}`))?.split("=")[1];
const LIMIT = process.argv.includes("--all") ? Infinity : Number(arg("limit") ?? 100);

async function main() {
  if (!fs.existsSync(PRODUCTS_FILE)) throw new Error(`Run "npm run images:sitemap" first (${PRODUCTS_FILE} missing)`);
  const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf8")) as AroggaProduct[];
  const byBrand = indexProducts(products);
  const cache: ImageCache = fs.existsSync(IMAGE_CACHE_FILE) ? JSON.parse(fs.readFileSync(IMAGE_CACHE_FILE, "utf8")) : {};

  await connectDB();
  const [medicines, generics] = await Promise.all([
    Medicine.find({ "image.approved": { $ne: true } }).select("slug brand strength dosageForm formSlug genericId").lean(),
    Generic.find().select("brandCount").lean(),
  ]);
  const popularity = new Map(generics.map((g) => [String(g._id), g.brandCount ?? 0]));

  const rows: Row[] = medicines.map((m) => {
    const { status, best } = matchMedicine({ slug: m.slug, brand: m.brand, strength: m.strength ?? null, formSlug: m.formSlug }, byBrand);
    return {
      slug: m.slug,
      brand: m.brand,
      strength: m.strength ?? null,
      dosageForm: m.dosageForm,
      status,
      score: best?.score ?? 0,
      aroggaUrl: best?.product.url ?? "",
      aroggaId: best?.product.id ?? "",
      imageUrl: "",
      imageHash: "",
      rank: popularity.get(String(m.genericId)) ?? 0,
    };
  });

  // Product pages: only sure matches, most common generics first, at most LIMIT new requests.
  // One arogga product claimed by several of our medicines (IM vs IV injection of one brand, duplicate rows) →
  // the photo can only be right for one of them and would be stored twice → none of them is sure.
  const claims = new Map<string, number>();
  for (const r of rows) if (r.status === "sure") claims.set(r.aroggaId, (claims.get(r.aroggaId) ?? 0) + 1);
  for (const r of rows) if (r.status === "sure" && (claims.get(r.aroggaId) ?? 0) > 1) r.status = "ambiguous";

  // --first=napa,seclo → medicines whose slug starts with one of these are fetched before everything else.
  const first = (arg("first") ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const wanted = (r: Row) => (first.some((p) => r.slug === p || r.slug.startsWith(`${p}-`)) ? 0 : 1);
  const sure = rows
    .filter((r) => r.status === "sure")
    .sort((a, b) => wanted(a) - wanted(b) || b.rank - a.rank || a.slug.localeCompare(b.slug));
  let fetched = 0;
  let hashed = 0;
  for (const r of sure) {
    let hit = cache[r.aroggaId];
    if (!hit) {
      if (fetched >= LIMIT) {
        r.status = "pending"; // sure match, page not fetched yet (raise --limit or use --all)
        continue;
      }
      await sleep(1000);
      try {
        hit = cache[r.aroggaId] = extractImage(await fetchText(r.aroggaUrl));
      } catch (err) {
        console.error(`  skip ${r.aroggaUrl}: ${(err as Error).message}`);
        r.status = "pending";
        continue;
      }
      fetched++;
      if (fetched % 20 === 0) {
        fs.writeFileSync(IMAGE_CACHE_FILE, JSON.stringify(cache));
        console.log(`  fetched ${fetched} pages…`);
      }
    }
    // Hash the image file itself: arogga's "no image" picture has ordinary-looking file names, only its content tells.
    if (hit.imageUrl && !hit.hash) {
      await sleep(300);
      try {
        hit.hash = createHash("md5").update(await fetchBuffer(hit.imageUrl)).digest("hex");
      } catch (err) {
        console.error(`  no hash for ${r.aroggaUrl}: ${(err as Error).message}`);
      }
      if (++hashed % 50 === 0) {
        fs.writeFileSync(IMAGE_CACHE_FILE, JSON.stringify(cache));
        console.log(`  checked ${hashed} image files…`);
      }
    }
  }
  fs.writeFileSync(IMAGE_CACHE_FILE, JSON.stringify(cache));

  // Decide after all hashes are known: a file shared by several products is a placeholder, whichever run fetched it.
  const blocked = placeholderHashes(Object.values(cache).flatMap((c) => (c.hash ? [c.hash] : [])));
  for (const r of sure) {
    const hit = cache[r.aroggaId];
    if (r.status !== "sure" || !hit) continue;
    if (!hit.imageUrl) r.status = hit.placeholder ? "placeholder" : "none";
    else if (!hit.hash) r.status = "pending"; // could not verify the file → not uploaded
    else if (blocked.has(hit.hash)) r.status = "placeholder";
    else {
      r.imageUrl = hit.imageUrl;
      r.imageHash = hit.hash;
    }
  }

  const header = "ourSlug,ourBrand,ourStrength,ourForm,status,score,aroggaUrl,imageUrl,imageHash";
  const order = ["sure", "pending", "placeholder", "ambiguous", "none"];
  rows.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || b.rank - a.rank || a.slug.localeCompare(b.slug));
  const lines = rows.map((r) =>
    [r.slug, r.brand, r.strength, r.dosageForm, r.status, r.score, r.aroggaUrl, r.imageUrl, r.imageHash].map(csvCell).join(",")
  );
  fs.writeFileSync(REPORT_FILE, "﻿" + [header, ...lines].join("\n"));

  const count = (s: Row["status"]) => rows.filter((r) => r.status === s).length;
  console.log(`\n${medicines.length} medicines without an approved image:`);
  console.log(`  sure + image found : ${count("sure")}   ← only these are uploaded by images:upload`);
  console.log(`  sure, not fetched  : ${count("pending")}   (re-run with a higher --limit or --all)`);
  console.log(`  sure, no real image: ${count("placeholder")}   (arogga shows a placeholder)`);
  console.log(`  ambiguous          : ${count("ambiguous")}   (several candidates or partial match — never uploaded)`);
  console.log(`  no match           : ${count("none")}`);
  console.log(`\nReport → ${REPORT_FILE} (open in Excel; nothing was written to the DB)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
