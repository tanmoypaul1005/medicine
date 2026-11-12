/**
 * npm run images:upload            → preview only (lists what would be uploaded)
 * npm run images:upload -- --confirm → uploads the report's `sure` rows to Cloudinary and saves them on the
 *                                     medicine with approved:false (not shown on the site until images:approve).
 * Images are taken exactly as arogga serves them. Approved images are never touched; re-running skips finished rows.
 */
import fs from "node:fs";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { connectDB } from "@/lib/db";
import { Medicine } from "@/models";
import { IMAGE_SOURCE, REPORT_FILE, parseCsv, sleep } from "./lib";

const CONFIRM = process.argv.includes("--confirm");
const FOLDER = "oshudkhuji/medicines";

async function main() {
  if (!fs.existsSync(REPORT_FILE)) throw new Error(`Run "npm run images:match" first (${REPORT_FILE} missing)`);
  const rows = parseCsv(fs.readFileSync(REPORT_FILE, "utf8")).filter((r) => r.status === "sure" && r.imageUrl);

  await connectDB();
  const existing = await Medicine.find({ slug: { $in: rows.map((r) => r.ourSlug) }, "image.url": { $exists: true } })
    .select("slug image.approved image.sourceUrl")
    .lean();
  const done = new Map(existing.map((m) => [m.slug, m.image]));
  const todo = rows.filter((r) => {
    const img = done.get(r.ourSlug);
    return !img || (!img.approved && img.sourceUrl !== r.aroggaUrl);
  });

  console.log(`${rows.length} sure rows in the report, ${rows.length - todo.length} already imported, ${todo.length} to upload.`);
  if (!CONFIRM) {
    for (const r of todo.slice(0, 20)) console.log(`  ${r.ourSlug}  ←  ${r.aroggaUrl}`);
    if (todo.length > 20) console.log(`  … and ${todo.length - 20} more`);
    console.log(`\nPreview only. Check ${REPORT_FILE}, then run: npm run images:upload -- --confirm`);
    return;
  }

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env");
  }
  cloudinary.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET, secure: true });

  let ok = 0;
  let failed = 0;
  for (const r of todo) {
    try {
      // Cloudinary pulls the image from the URL itself; nothing is stored locally.
      const up = await cloudinary.uploader.upload(r.imageUrl, { public_id: `${FOLDER}/${r.ourSlug}`, overwrite: true, resource_type: "image" });
      await Medicine.updateOne(
        { slug: r.ourSlug, "image.approved": { $ne: true } },
        {
          $set: {
            image: {
              url: up.secure_url,
              publicId: up.public_id,
              width: up.width,
              height: up.height,
              source: IMAGE_SOURCE,
              sourceUrl: r.aroggaUrl,
              approved: false,
              importedAt: new Date(),
            },
          },
        }
      );
      ok++;
      if (ok % 10 === 0) console.log(`  uploaded ${ok}/${todo.length}…`);
    } catch (err) {
      failed++;
      console.error(`  failed ${r.ourSlug}: ${(err as { message?: string }).message ?? JSON.stringify(err)}`);
    }
    await sleep(500);
  }
  console.log(`\nUploaded ${ok}, failed ${failed}. Images are NOT visible yet: review them in Cloudinary (${FOLDER}), then run "npm run images:approve".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
