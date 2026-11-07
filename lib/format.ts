import type { Locale } from "@/lib/i18n/config";

// Project rule (user decision): EVERY number in the UI uses English digits, in both languages —
// prices, counts, page numbers, percentages. Bangla digits were hard to read next to English
// strengths ("16.7%") and "৳" + Bangla digits reads wrong (৳ looks like ৮ → "৳১২" ≈ 812).
const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** Plain number for UI text: "20", "21,714", "1.5". `lang` kept for call-site symmetry. */
export function formatNumber(lang: Locale, n: number): string {
  void lang;
  return nf.format(n);
}

/**
 * What a price is for. Always show it next to a price: 8k+ medicines are priced per pack (tube/bottle),
 * not per unit, so "100 টাকা" alone is misleading. → "প্রতি একক" or "/ 5 gm tube".
 */
export function priceBasis(priceLabel: string | null | undefined, perUnitText: string): string {
  return priceLabel ? `/ ${priceLabel}` : perUnitText;
}

/** Price display: bn → "12.5 টাকা", en → "৳12.5". */
export function formatPrice(lang: Locale, n: number): string {
  return lang === "bn" ? `${nf.format(n)} টাকা` : `৳${nf.format(n)}`;
}
