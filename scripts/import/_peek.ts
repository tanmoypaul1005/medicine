import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { ingredientsOf } from "@/lib/ingredients";
import { Generic } from "@/models";
async function main() {
  await connectDB();
  const gens = await Generic.find().select("name").lean();
  const keys = new Set<string>();
  for (const g of gens) for (const i of ingredientsOf(g.name)) keys.add(i.key);
  const probes = ["amylmetacresol","dichlorobenzyl","chlorhexidine","povidone","cetylpyridinium","benzoyl","salicylic","calamine","zinc oxide","acyclovir","aciclovir","methyl salicylate","menthol","diclofenac","ferrous","iron","folic","nicotine","lidocaine","adapalene","clindamycin","hexetidine","triclosan","camphor","eucalyptus","capsaicin","piroxicam","ketoprofen","glycerin","urea","lactic acid","miconazole","nystatin","heparin","troxerutin","silver","mupirocin","fusidic","cetrimide","neomycin","vitamin d3","calcium","electrolyte","loperamide","domperidone","ondansetron","oxymetazoline","sodium chloride","saline"];
  for (const p of probes) console.log(p.padEnd(18), "->", [...keys].filter((k) => k.includes(p)).slice(0, 6).join(" | ") || "(none)");
}
main().finally(() => mongoose.disconnect());
