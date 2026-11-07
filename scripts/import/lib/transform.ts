import sanitizeHtml from "sanitize-html";
import { slugify } from "@/lib/utils";

// ---------- Price ----------
export type Pack = { label: string; price: number; qty?: number; qtyPrice?: number };
export type ParsedPrice = { unitPrice: number | null; packs: Pack[] };

const NUM = String.raw`(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)`; // "2,950.00" | "5.98"
// Either "(30's pack: ৳ 97.50)" or "<label>: ৳ <price>" (label never starts with a pack group)
const TOKEN = new RegExp(
  String.raw`\((\d+)'s pack:\s*৳\s*${NUM}\)|(?:^|,)(?!\(\d+'s pack)\s*([^,:৳]+?):\s*৳\s*${NUM}`,
  "g"
);
const num = (s: string) => Number(s.replace(/,/g, ""));
const isUnitLabel = (l: string) => /^unit price$/i.test(l) || /^each\b/i.test(l);

/**
 * "Unit Price: ৳ 6.50,(15's pack: ৳ 97.50),,Unit Price: ৳ 6.50,(30's pack: ৳ 195.00),"
 * "100 ml bottle: ৳ 50.00,225 ml bottle: ৳ 90.00" | "Price Unavailable" | "Not for sale"
 */
export function parsePrice(text: string): ParsedPrice {
  const packs: Pack[] = [];
  for (const m of text.matchAll(TOKEN)) {
    if (m[1]) {
      const last = packs.at(-1);
      if (last && last.qty == null) {
        last.qty = Number(m[1]);
        last.qtyPrice = num(m[2]);
      }
    } else {
      const label = m[3].trim();
      packs.push({ label: isUnitLabel(label) ? "unit" : label, price: num(m[4]) });
    }
  }
  const unit = packs.find((p) => p.label === "unit");
  const unitPrice = unit ? unit.price : packs.length ? Math.min(...packs.map((p) => p.price)) : null;
  return { unitPrice, packs };
}

// ---------- HTML monograph sections ----------
const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "ul", "ol", "li", "strong", "b", "em", "i", "sub", "sup", "h4", "table", "thead", "tbody", "tr", "th", "td"],
  allowedAttributes: {},
  transformTags: { h4: "strong" },
};

/** Keeps only the "full-str" copy, drops "Read more" toggles, sanitizes to an allowlist. */
export function cleanHtml(raw: string): string | undefined {
  if (!raw) return undefined;
  let html = raw;
  const full = html.indexOf('class="full-str"');
  if (full >= 0) html = html.slice(html.indexOf(">", full) + 1);
  html = html.replace(/<span[^>]*toggle[^>]*>[\s\S]*?<\/span>/g, "");
  const clean = sanitizeHtml(html, SANITIZE)
    .replace(/(\s*<br \/>\s*)+$/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
  return clean || undefined;
}

export function htmlToText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
}

/** Label HTML → plain sentences (list items and line breaks become sentence ends). */
export function htmlSentences(html: string): string[] {
  const text = htmlToText(html.replace(/<\/(li|p|h4|tr)>|<br\s*\/?>/gi, ". "));
  return text
    .split(/(?<=[.!?;])\s+(?=[A-Z(])/)
    .map((s) => s.replace(/(\.\s*)+$/, ".").replace(/^\.\s*/, "").trim())
    .filter((s) => s.length >= 15 && s.length <= 600);
}

const PREG =/Pregnancy\s+Category\s*:?\s*([ABCDXN])\b/i;
export function parsePregnancyCategory(html?: string): "A" | "B" | "C" | "D" | "X" | "N" | undefined {
  const m = html ? htmlToText(html).match(PREG) : null;
  return m ? (m[1].toUpperCase() as "A" | "B" | "C" | "D" | "X" | "N") : undefined;
}

// ---------- Slugs ----------
/**
 * Deterministic slugs: sort by numeric sourceId, first owner gets the clean slug,
 * later clashes get "-<sourceId>". Same CSV → same slugs on every re-import.
 */
export function assignSlugs<T extends { sourceId: string }>(items: T[], base: (x: T) => string): Map<string, string> {
  const out = new Map<string, string>();
  const used = new Set<string>();
  for (const x of [...items].sort((a, b) => Number(a.sourceId) - Number(b.sourceId))) {
    let s = slugify(base(x)) || `item-${x.sourceId}`;
    if (used.has(s)) s = `${s}-${x.sourceId}`;
    used.add(s);
    out.set(x.sourceId, s);
  }
  return out;
}

export const key = (s: string) => s.trim().toLowerCase();
