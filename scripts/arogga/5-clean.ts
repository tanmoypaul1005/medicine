/**
 * npm run images:clean              → report: imported images whose file is identical on several medicines
 * npm run images:clean -- --confirm → delete those from Cloudinary and remove them from the medicines
 * A real product photo belongs to one product; the same file on 3+ medicines is arogga's "no image" picture.
 * Also fills `image.hash` (md5 of the file) for images imported before hashes were stored.
 */
import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { connectDB } from "@/lib/db";
import { Medicine } from "@/models";
import { PLACEHOLDER_MIN_COPIES, sleep } from "./lib";

const CONFIRM = process.argv.includes("--confirm");

async function main() {
  await connectDB();
  const all = await Medicine.find({ "image.url": { $exists: true } }).select("slug image").lean();

  // 1. hash images that have none yet (download the stored original once)
  let hashed = 0;
  for (const m of all) {
    if (m.image?.hash || !m.image?.url) continue;
    try {
      const res = await fetch(m.image.url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const hash = createHash("md5").update(Buffer.from(await res.arrayBuffer())).digest("hex");
      await Medicine.updateOne({ slug: m.slug }, { $set: { "image.hash": hash } });
      m.image.hash = hash;
      if (++hashed % 50 === 0) console.log(`  hashed ${hashed}…`);
    } catch (err) {
      console.error(`  could not hash ${m.slug}: ${(err as Error).message}`);
    }
    await sleep(100);
  }

  // 2. same file on several medicines = placeholder
  const groups = new Map<string, typeof all>();
  for (const m of all) {
    if (!m.image?.hash) continue;
    const g = groups.get(m.image.hash);
    if (g) g.push(m);
    else groups.set(m.image.hash, [m]);
  }
  const bad = [...groups.entries()].filter(([, g]) => g.length >= PLACEHOLDER_MIN_COPIES);
  const victims = bad.flatMap(([, g]) => g);

  console.log(`${all.length} imported images, ${groups.size} different files.`);
  for (const [hash, g] of bad) console.log(`  ${hash}  on ${g.length} medicines, e.g. ${g[0].image?.url}`);
  console.log(`${victims.length} placeholder images on ${bad.length} file(s).`);
  if (!victims.length) return;
  if (!CONFIRM) return console.log("\nNothing deleted. To remove them: npm run images:clean -- --confirm");

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) throw new Error("Cloudinary keys missing in .env");
  cloudinary.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET, secure: true });

  let removed = 0;
  for (const m of victims) {
    try {
      if (m.image?.publicId) await cloudinary.uploader.destroy(m.image.publicId, { invalidate: true });
      // Keep the hash + source so the upload step knows this file is a placeholder and never re-imports it.
      await Medicine.updateOne(
        { slug: m.slug },
        { $set: { image: { placeholder: true, hash: m.image?.hash, sourceUrl: m.image?.sourceUrl, approved: false } } }
      );
      removed++;
    } catch (err) {
      console.error(`  failed ${m.slug}: ${(err as { message?: string }).message ?? JSON.stringify(err)}`);
    }
  }
  console.log(`Removed ${removed} placeholder images. Refresh the site cache: POST /api/revalidate {"tags":["medicines"]}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
