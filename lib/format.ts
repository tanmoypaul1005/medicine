import type { Locale } from "@/lib/i18n/config";

const nf = {
  bn: new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 2 }),
  en: new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }),
};

/** Plain number in the page's digits: bn → "২০", en → "20". Use for every count shown in UI. */
export function formatNumber(lang: Locale, n: number): string {
  return nf[lang].format(n);
}

/**
 * What a price is for. Always show it next to a price: 8k+ medicines are priced per pack (tube/bottle),
 * not per unit, so "১০০ টাকা" alone is misleading. → "প্রতি একক" or "/ 5 gm tube".
 */
export function priceBasis(priceLabel: string | null | undefined, perUnitText: string): string {
  return priceLabel ? `/ ${priceLabel}` : perUnitText;
}

/**
 * Price display. bn → "12.5 টাকা", en → "৳12.5". Prices ALWAYS use English digits (user feedback):
 * Bangla digits in prices were hard to read ("১০০"), sit next to English strengths ("16.7%"), and
 * "৳" + Bangla digits is worse still (৳ looks like ৮ → "৳১২" reads as 812). Counts keep Bangla digits.
 */
export function formatPrice(lang: Locale, n: number): string {
  const amount = nf.en.format(n);
  return lang === "bn" ? `${amount} টাকা` : `৳${amount}`;
}
