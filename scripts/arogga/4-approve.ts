/**
 * npm run images:approve -- --slugs=a,b,c   approve these medicines' imported images
 * npm run images:approve -- --all           approve every imported, not yet approved image
 * add --undo to hide them again (approved:false).
 * Afterwards refresh the site cache: POST /api/revalidate {"tags":["medicines"]}.
 */
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Medicine } from "@/models";

const slugs = process.argv.find((a) => a.startsWith("--slugs="))?.slice(8).split(",").map((s) => s.trim()).filter(Boolean);
const ALL = process.argv.includes("--all");
const approved = !process.argv.includes("--undo");

async function main() {
  if (!slugs?.length && !ALL) throw new Error("Pass --slugs=a,b,c or --all");
  await connectDB();
  const filter = { "image.url": { $exists: true }, "image.approved": !approved, ...(slugs?.length && { slug: { $in: slugs } }) };
  const res = await Medicine.updateMany(filter, { $set: { "image.approved": approved } });
  console.log(`${approved ? "Approved" : "Hidden"}: ${res.modifiedCount} medicine image(s).`);
  console.log('Now refresh cached pages: POST /api/revalidate with body {"tags":["medicines"]}');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
