import type { Locale } from "@/lib/i18n/config";

const nf = {
  bn: new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 2 }),
  en: new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }),
};

/**
 * Price display. bn → "১২.৫ টাকা", en → "৳12.5".
 * Never "৳" + Bangla digits: in Bangla fonts ৳ looks like ৮, so "৳১২" reads as "৮১২".
 */
export function formatPrice(lang: Locale, n: number): string {
  return lang === "bn" ? `${nf.bn.format(n)} টাকা` : `৳${nf.en.format(n)}`;
}
