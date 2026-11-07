import "server-only";
import type { PipelineStage, QueryFilter } from "mongoose";
import { connectDB } from "@/lib/db";
import { bnToLatin, hasBangla } from "@/lib/search/bnTranslit";
import { Medicine, MEDICINE_SEARCH_INDEX, SearchLog, type MedicineDoc } from "@/models";
import { AUTOCOMPLETE_LIMIT, SEARCH_PAGE_SIZE } from "@/server/validators/search";

import type { MedicineHit, SearchResult } from "@/lib/search/types";

export type { MedicineHit, SearchResult };

/** variants: extra spellings for Bangla input (ক → k|c, e.g. "seklo" + "seclo"). */
export type ParsedQuery = { original: string; text: string; variants: string[]; strength?: string; bangla: boolean };

const PROJECT = { _id: 0, slug: 1, brand: 1, type: 1, strength: 1, dosageForm: 1, genericName: 1, manufacturerName: 1, unitPrice: 1, priceLabel: 1 };
const UNIT = /^(mg|mcg|gm|g|ml|iu|%)$/;
const NUM_UNIT = /^(\d+(?:\.\d+)?)(mg|mcg|gm|g|ml|iu|%)?$/;
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Latin spellings a transliterated Bangla word may correspond to: ফেক্সো "fekso" → fexo, fecso… (max 10) */
function spellingVariants(bases: string[], text: string): string[] {
  const rules: [RegExp, string][] = [
    [/ks/g, "x"],
    [/k/g, "c"],
    [/s(?=[ie])/g, "c"], // soft c: সিটা → cita (paracetamol)
    [/j/g, "g"],
    [/j/g, "z"], // প্রাজল → prazol (omeprazole)
    [/sh/g, "s"],
    [/f/g, "ph"],
  ];
  let out = bases;
  // (no re.test here: /g regexes keep lastIndex between calls and silently skip matches)
  for (const [re, to] of rules) out = [...out, ...out.map((v) => v.replace(re, to))];
  return [...new Set(out)].filter((v) => v && v !== text).slice(0, 10);
}

function cleanText(latin: string) {
  let strength: string | undefined;
  const words: string[] = [];
  for (const t of latin.toLowerCase().split(" ")) {
    const m = NUM_UNIT.exec(t);
    if (m && !strength) strength = m[1];
    else if (!(UNIT.test(t) && strength)) words.push(t);
  }
  return { text: words.join(" ").replace(/[^\p{L}\p{N}\s+\-]/gu, "").trim(), strength };
}

/** "Napa 500mg" → { text: "napa", strength: "500" }; "নাপা ৫০০" → { text: "napa", strength: "500", bangla: true } */
export function parseQuery(raw: string): ParsedQuery {
  const original = raw.normalize("NFC").replace(/\s+/g, " ").trim().slice(0, 60);
  const bangla = hasBangla(original);
  const { text, strength } = cleanText(bangla ? bnToLatin(original) : original);
  const variants = bangla ? spellingVariants([text, cleanText(bnToLatin(original, { inherent: true })).text], text) : [];
  return { original, text, variants, strength, bangla };
}

// ---------- Atlas Search ----------
function searchStage(p: ParsedQuery, extra: Record<string, unknown> = {}): PipelineStage {
  const fuzzy =
    p.text.length >= 4 ? { maxEdits: p.bangla ? 2 : 1, prefixLength: p.bangla ? 0 : 1, maxExpansions: 50 } : undefined;
  const boost = (value: number) => ({ boost: { value } });
  const textClauses = [
    { text: { path: "brand", query: p.text, score: boost(8) } }, // exact word in brand
    { autocomplete: { path: "brand", query: p.text, ...(fuzzy && { fuzzy }), score: boost(5) } },
    { text: { path: "genericName", query: p.text, ...(fuzzy && { fuzzy }), score: boost(2) } },
    { autocomplete: { path: "genericName", query: p.text, ...(fuzzy && { fuzzy }), score: boost(2) } },
    { text: { path: "aliases", query: p.original, score: boost(8) } },
    { autocomplete: { path: "aliases", query: p.original, score: boost(5) } },
    ...p.variants.flatMap((v) => [
      { text: { path: "brand", query: v, score: boost(8) } },
      { text: { path: "brand", query: v, fuzzy: { maxEdits: 1, prefixLength: 0 }, score: boost(4) } },
      { autocomplete: { path: "brand", query: v, score: boost(5) } },
      { text: { path: "genericName", query: v, fuzzy: { maxEdits: v.length >= 8 ? 2 : 1, prefixLength: 1 }, score: boost(2) } },
    ]),
  ];
  const compound: Record<string, unknown> = { must: [{ compound: { should: textClauses, minimumShouldMatch: 1 } }] };
  if (p.strength) compound.should = [{ text: { path: "strength", query: p.strength, score: boost(4) } }];

  return {
    $search: { index: MEDICINE_SEARCH_INDEX, compound, sort: { score: { $meta: "searchScore" }, brand: 1 }, ...extra },
  } as PipelineStage;
}

async function atlasSearch(p: ParsedQuery, skip: number, limit: number) {
  const [res] = await Medicine.aggregate<{ hits: MedicineHit[]; meta: { count?: { total?: number } }[] }>([
    searchStage(p, { count: { type: "total" } }),
    {
      $facet: {
        hits: [{ $skip: skip }, { $limit: limit }, { $project: PROJECT }],
        meta: [{ $replaceWith: "$$SEARCH_META" }, { $limit: 1 }],
      },
    },
  ]);
  return { hits: res?.hits ?? [], total: res?.meta[0]?.count?.total ?? 0 };
}

// ---------- Regex fallback (index missing/building, or substring the analyzer can't see) ----------
async function regexSearch(p: ParsedQuery, skip: number, limit: number) {
  const alts = [p.text, ...p.variants].map(escapeRegex).join("|");
  const filter: QueryFilter<MedicineDoc> = {
    $or: [
      { brand: new RegExp(`^(${alts})`, "i") },
      { genericName: new RegExp(alts, "i") },
      { aliases: p.original },
    ],
  };
  if (p.strength) filter.strength = new RegExp(`(^|[^\\d.])${escapeRegex(p.strength)}([^\\d.]|$)`);
  const [hits, total] = await Promise.all([
    Medicine.find(filter).sort({ brand: 1, strength: 1 }).skip(skip).limit(limit).select(PROJECT).lean<MedicineHit[]>(),
    Medicine.countDocuments(filter),
  ]);
  return { hits, total };
}

async function run(p: ParsedQuery, skip: number, limit: number): Promise<{ hits: MedicineHit[]; total: number; engine: SearchResult["engine"] }> {
  if (!p.text) return { hits: [], total: 0, engine: "atlas" };
  try {
    const r = await atlasSearch(p, skip, limit);
    if (r.total > 0) return { ...r, engine: "atlas" };
  } catch (err) {
    console.error("[search] Atlas Search failed, using regex fallback:", (err as Error).message);
  }
  return { ...(await regexSearch(p, skip, limit)), engine: "regex" };
}

// ---------- Public API ----------
export async function autocomplete(q: string): Promise<MedicineHit[]> {
  await connectDB();
  return (await run(parseQuery(q), 0, AUTOCOMPLETE_LIMIT)).hits;
}

export async function searchMedicines(q: string, page = 1): Promise<SearchResult> {
  await connectDB();
  const p = parseQuery(q);
  const r = await run(p, (page - 1) * SEARCH_PAGE_SIZE, SEARCH_PAGE_SIZE);
  if (r.total === 0 && p.original) await logZeroResult(p.original);
  return { hits: r.hits, total: r.total, engine: r.engine, page, pages: Math.max(1, Math.ceil(r.total / SEARCH_PAGE_SIZE)) };
}

/** Zero-result queries feed future aliases / data fixes. Never fails the search. */
async function logZeroResult(query: string) {
  try {
    await SearchLog.updateOne(
      { query: query.toLowerCase() },
      { $inc: { count: 1 }, $set: { lastSeenAt: new Date() } },
      { upsert: true }
    );
  } catch (err) {
    console.error("[search] SearchLog failed:", (err as Error).message);
  }
}
