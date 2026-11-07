// Rough Bangla → Latin transliteration for search only (not display).
// "নাপা ৫০০" → "napa 500", "সেকলো" → "seklo" (fuzzy search then matches "Seclo").
// Inherent vowel is dropped (brand names are written phonetically); fuzzy matching absorbs the rest.

const CONSONANTS: Record<string, string> = {
  ক: "k", খ: "kh", গ: "g", ঘ: "gh", ঙ: "ng", চ: "ch", ছ: "ch", জ: "j", ঝ: "jh", ঞ: "n",
  ট: "t", ঠ: "th", ড: "d", ঢ: "dh", ণ: "n", ত: "t", থ: "th", দ: "d", ধ: "dh", ন: "n",
  প: "p", ফ: "f", ব: "b", ভ: "bh", ম: "m", য: "j", র: "r", ল: "l", শ: "sh", ষ: "sh",
  স: "s", হ: "h", "ড়": "r", "ঢ়": "rh", "য়": "y", ৎ: "t",
};
const VOWELS: Record<string, string> = {
  অ: "o", আ: "a", ই: "i", ঈ: "i", উ: "u", ঊ: "u", ঋ: "ri", এ: "e", ঐ: "oi", ও: "o", ঔ: "ou",
};
const SIGNS: Record<string, string> = {
  "া": "a", "ি": "i", "ী": "i", "ু": "u", "ূ": "u", "ৃ": "ri", "ে": "e", "ৈ": "oi", "ো": "o", "ৌ": "ou",
};
const OTHER: Record<string, string> = { "ং": "ng", "ঃ": "h", "ঁ": "", "্": "", "়": "" };
const DIGITS = "০১২৩৪৫৬৭৮৯";

const BANGLA = /[ঀ-৿]/;
export const hasBangla = (s: string) => BANGLA.test(s);

/**
 * inherent=false: drop the inherent vowel ("সেকলো" → "seklo", matches Seclo)
 * inherent=true:  add "o" between bare consonants ("এলাট্রল" → "elatrol", matches Alatrol)
 * Search queries both spellings.
 */
export function bnToLatin(input: string, { inherent = false } = {}): string {
  // Decomposed nukta forms → precomposed (ড় ঢ় য়)
  const s = input.replace(/ড়/g, "ড়").replace(/ঢ়/g, "ঢ়").replace(/য়/g, "য়");
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c in CONSONANTS) {
      // য-ফলা (্য) after a consonant is silent-ish: প্যারা → para
      if (c === "য" && s[i - 1] === "্") continue;
      out += CONSONANTS[c];
      if (inherent && s[i + 1] in CONSONANTS && !(s[i + 1] === "য" && s[i] === "্")) out += "o";
    } else if (c in VOWELS) out += VOWELS[c];
    else if (c in SIGNS) out += SIGNS[c];
    else if (c in OTHER) out += OTHER[c];
    else if (DIGITS.includes(c)) out += String(DIGITS.indexOf(c));
    else out += c;
  }
  return out;
}
