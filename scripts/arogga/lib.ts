/** Shared helpers for the arogga image import (docs/medicine-images-plan.md). Pure functions: no DB, no env. */

export const DATA_DIR = "data/arogga";
export const PRODUCTS_FILE = `${DATA_DIR}/products.json`;
export const REPORT_FILE = `${DATA_DIR}/report.csv`;
export const IMAGE_CACHE_FILE = `${DATA_DIR}/images.json`;
export const IMAGE_SOURCE = "arogga.com (permission)";
/** The same image file on this many medicines is arogga's "no image" picture, not a product photo. */
export const PLACEHOLDER_MIN_COPIES = 3;

export type AroggaProduct = { id: string; slug: string; url: string };

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * arogga's "no image" pictures (md5 of the file as their CDN serves it). Their file names look like real uploads
 * ("WhatsApp-Image-…", "Untitled"), so only the content tells. Unknown ones are caught by PLACEHOLDER_MIN_COPIES.
 */
export const PLACEHOLDER_HASHES = new Set(["5ea46adbd35e810f863d743eadaab6a9", "c62cb099b0062bfff4e6e9d9eee2c9dd"]);

/** hashes = every image hash seen so far (one entry per arogga product). */
export function placeholderHashes(hashes: string[]): Set<string> {
  const counts = new Map<string, number>();
  for (const h of hashes) counts.set(h, (counts.get(h) ?? 0) + 1);
  const out = new Set(PLACEHOLDER_HASHES);
  for (const [h, n] of counts) if (n >= PLACEHOLDER_MIN_COPIES) out.add(h);
  return out;
}

export const fetchText = async (url: string) => (await fetchBuffer(url)).toString("utf8");

/** Polite fetch: generic UA, retries with backoff on 429/5xx/network errors. */
export async function fetchBuffer(url: string, tries = 4): Promise<Buffer> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    if (i) await sleep(2000 * 2 ** i);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; medicine-image-import/1.0)" },
        signal: AbortSignal.timeout(30_000),
      });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      if (res.status !== 429 && res.status < 500) throw Object.assign(new Error(`HTTP ${res.status} ${url}`), { fatal: true });
      lastErr = new Error(`HTTP ${res.status} ${url}`);
    } catch (err) {
      if ((err as { fatal?: boolean }).fatal) throw err;
      lastErr = err;
    }
  }
  throw lastErr;
}

// ---------- matching ----------
/** A number with an optional unit ("500mg", "60ml", "5") or a bare unit word ("ml", "vial"). */
const STRENGTH_TOKEN = /^(?:\d+(?:\.\d+)?[a-z]*|mg|mcg|gm|g|kg|ml|l|iu|vial|ampoule|amp|dose|puff|actuation|unit|units)$/;

const PACK_TOKEN = /^\d+(?:\.\d+)?(?:ml|l|g|gm|kg)$/;

/** Words that describe the form in an arogga slug, longest phrase first. Value = canonical form family. */
const FORM_WORDS: [string, string][] = [
  ["powder-for-suspension", "suspension"],
  ["oral-suspension", "suspension"],
  ["paediatric-drops", "drops"],
  ["pediatric-drops", "drops"],
  ["eye-drops", "eyedrops"],
  ["eye-drop", "eyedrops"],
  ["ear-drops", "eardrops"],
  ["ear-drop", "eardrops"],
  ["nasal-drops", "nasaldrops"],
  ["nasal-drop", "nasaldrops"],
  ["nasal-spray", "nasalspray"],
  ["eye-ointment", "eyeointment"],
  ["oral-solution", "solution"],
  ["oral-gel", "oralgel"],
  ["iv-infusion", "infusion"],
  ["im-injection", "injection"],
  ["iv-injection", "injection"],
  ["tablet", "tablet"],
  ["capsule", "capsule"],
  ["syrup", "syrup"],
  ["suspension", "suspension"],
  ["injection", "injection"],
  ["infusion", "infusion"],
  ["suppository", "suppository"],
  ["cream", "cream"],
  ["ointment", "ointment"],
  ["gel", "gel"],
  ["lotion", "lotion"],
  ["drops", "drops"],
  ["drop", "drops"],
  ["inhaler", "inhaler"],
  ["solution", "solution"],
  ["powder", "powder"],
  ["sachet", "powder"],
  ["spray", "spray"],
  ["shampoo", "shampoo"],
  ["emulsion", "emulsion"],
  ["elixir", "elixir"],
];

/** Our `formSlug` ("tablet-enteric-coated", "powder-for-suspension", "ophthalmic-solution"…) → form family. */
export function formFamily(formSlug: string): string | null {
  const s = formSlug.toLowerCase();
  if (/ophthalmic|eye/.test(s)) return /ointment/.test(s) ? "eyeointment" : "eyedrops";
  if (/\bear\b|otic/.test(s)) return "eardrops";
  if (/nasal/.test(s)) return /spray/.test(s) ? "nasalspray" : "nasaldrops";
  if (/oral-gel/.test(s)) return "oralgel";
  for (const [word, family] of FORM_WORDS) if (s.includes(word)) return family;
  return null;
}

/** One strength part: "500 MG" → "500mg", "2.50mg" → "2.5mg", "5 %" → "5" (arogga slugs drop "%"), "vial" → "vial". */
function normPart(t: string): string {
  const m = /^(\d+(?:\.\d+)?)(.*)$/.exec(t);
  return m ? `${parseFloat(m[1])}${m[2]}` : t;
}

/** Our strength as a sorted list of parts: "120 mg/5 ml" → ["120mg","5ml"]; "500 mg+65 mg" → ["500mg","65mg"]. */
export function strengthParts(s: string | null | undefined): string[] | null {
  if (!s) return null;
  const parts = s
    .toLowerCase()
    .replace(/[\s,%]+/g, "")
    .split(/[/+]/)
    .filter(Boolean)
    .map(normPart)
    .sort();
  return parts.length ? parts : null;
}

export const normBrand = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

export type ParsedSlug = { brands: string[]; form: string; strength: string[] };

/**
 * arogga slug = brand words [+ strength/pack number], form words (sometimes repeated), strength tokens:
 * "napa-500-tablet-500mg", "ace-100ml-syrup-120mg-5ml", "napa-paediatric-drops-pediatric-drops-80mg-ml",
 * "alatrol-paediatric-drops-pediatric-drops-2-5mg-ml" (2.5 mg/ml: the decimal point became "-").
 * brands = the brand as written ("napa500") and with trailing number/pack tokens removed ("napa").
 */
export function parseAroggaSlug(slug: string): ParsedSlug | null {
  const s = slug.toLowerCase();
  let best: { idx: number; family: string } | null = null;
  for (const [word, family] of FORM_WORDS) {
    const m = new RegExp(`(?:^|-)${word}(?=-|$)`).exec(s);
    if (!m) continue;
    const idx = m.index + (s[m.index] === "-" ? 1 : 0);
    // Earliest form word wins; on a tie the longer phrase (listed first) is already kept.
    if (!best || idx < best.idx) best = { idx, family };
  }
  if (!best || best.idx === 0) return null;

  // Strength = the trailing run of number/unit tokens.
  const tokens = s.slice(best.idx).split("-").filter(Boolean);
  let start = tokens.length;
  while (start > 0 && STRENGTH_TOKEN.test(tokens[start - 1])) start--;
  const strength = tokens.slice(start);

  // Brand tail to drop: a pack size ("ace-100ml") or the strength repeated as a bare number ("napa-500" + "500mg").
  // Any other number is part of the brand name ("cefim-3" is not "cefim").
  const strengthNumbers = new Set(strength.map((t) => /^\d+(?:\.\d+)?/.exec(t)?.[0]).filter(Boolean));
  const droppable = (t: string) => PACK_TOKEN.test(t) || (/^\d+$/.test(t) && strengthNumbers.has(t));
  const brandTokens = s.slice(0, best.idx).split("-").filter(Boolean);
  const full = normBrand(brandTokens.join(""));
  while (brandTokens.length > 1 && droppable(brandTokens[brandTokens.length - 1])) brandTokens.pop();
  const base = normBrand(brandTokens.join(""));

  return { brands: [...new Set([full, base])], form: best.family, strength };
}

/**
 * Does our strength equal arogga's trailing tokens? Order is ignored ("65mg-500mg" = "500 mg+65 mg") and a bare
 * number followed by another number may be a decimal ("2-5mg" = "2.5 mg"), so every way of joining them is tried.
 */
export function sameStrength(ours: string[] | null, tokens: string[]): boolean {
  if (!ours || !tokens.length || tokens.length > 8) return false;
  const want = ours.join("|");
  const gaps = tokens.length - 1;
  for (let mask = 0; mask < 1 << gaps; mask++) {
    const parts: string[] = [];
    let ok = true;
    for (let i = 0; i < tokens.length; i++) {
      // bit i-1 set → token i is the fraction of token i-1
      if (i > 0 && mask & (1 << (i - 1))) {
        const prev = parts[parts.length - 1];
        if (!/^\d+$/.test(prev) || !/^\d/.test(tokens[i])) {
          ok = false;
          break;
        }
        parts[parts.length - 1] = `${prev}.${tokens[i]}`;
      } else parts.push(tokens[i]);
    }
    if (ok && parts.map(normPart).sort().join("|") === want) return true;
  }
  return false;
}

export type OurMedicine = { slug: string; brand: string; strength: string | null; formSlug: string };
export type Match = { product: AroggaProduct; score: number };

/** brand +3, strength +2, form +1 (plan §6). Only brand-equal products are candidates. */
export function scoreMatch(m: OurMedicine, p: ParsedSlug): number {
  if (!p.brands.includes(normBrand(m.brand))) return 0;
  let score = 3;
  if (sameStrength(strengthParts(m.strength), p.strength)) score += 2;
  if (formFamily(m.formSlug) === p.form) score += 1;
  return score;
}

/** Index arogga products by normalized brand for O(1) candidate lookup. */
export function indexProducts(products: AroggaProduct[]) {
  const byBrand = new Map<string, { product: AroggaProduct; parsed: ParsedSlug }[]>();
  for (const product of products) {
    const parsed = parseAroggaSlug(product.slug);
    if (!parsed) continue;
    for (const brand of parsed.brands) {
      const list = byBrand.get(brand);
      if (list) list.push({ product, parsed });
      else byBrand.set(brand, [{ product, parsed }]);
    }
  }
  return byBrand;
}

export type MatchStatus = "sure" | "ambiguous" | "none";

/** sure = exactly one candidate with the full score 6; several 6s or only partial scores → ambiguous. */
export function matchMedicine(
  m: OurMedicine,
  byBrand: ReturnType<typeof indexProducts>
): { status: MatchStatus; best: Match | null } {
  const scored = (byBrand.get(normBrand(m.brand)) ?? [])
    .map((c) => ({ product: c.product, score: scoreMatch(m, c.parsed) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return { status: "none", best: null };
  const full = scored.filter((c) => c.score === 6);
  return { status: full.length === 1 ? "sure" : "ambiguous", best: scored[0] };
}

// ---------- product page ----------
/** og:image of a product page; null when missing or when it is arogga's "no image" placeholder. */
export function extractImage(html: string): { imageUrl: string | null; placeholder: boolean } {
  const m = /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/.exec(html);
  if (!m) return { imageUrl: null, placeholder: false };
  const imageUrl = m[1].replace(/&amp;/g, "&");
  let key = "";
  try {
    const token = imageUrl.split("/").pop() ?? "";
    key = String((JSON.parse(Buffer.from(token, "base64").toString("utf8")) as { key?: string }).key ?? "");
  } catch {
    // not the usual base64 CDN URL → keep the URL, no placeholder check possible
  }
  const placeholder = /no[-_ ]?image/i.test(key);
  return { imageUrl: placeholder ? null : imageUrl, placeholder };
}

/** Minimal CSV reader for our own report (quoted cells, "" escapes, optional BOM). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === "," || c === "\n") {
      row.push(cell);
      cell = "";
      if (c === "\n") {
        rows.push(row);
        row = [];
      }
    } else if (c !== "\r") cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

export const csvCell =(v: string | number | null | undefined) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
