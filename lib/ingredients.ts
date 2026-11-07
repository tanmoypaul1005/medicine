// Generic name → active ingredient keys, used to match interactions at ingredient level.
// "Paracetamol + Caffeine" → ["paracetamol", "caffeine"]; "Omeprazole Magnesium" → ["omeprazole"];
// "Acyclovir (Topical)" → ["acyclovir"]; "Warfarin Sodium" → ["warfarin"].

const SALTS = new Set(
  (
    "hydrochloride dihydrochloride hcl hydrobromide sodium disodium potassium magnesium maleate mesylate mesilate " +
    "besylate besilate citrate sulfate sulphate bisulfate phosphate fumarate hemifumarate tartrate bitartrate succinate " +
    "acetate monohydrate trihydrate dihydrate hemihydrate sesquihydrate anhydrous bromide nitrate propionate " +
    "dipropionate valerate furoate xinafoate hyclate lactate gluconate malate oxalate pamoate embonate tromethamine " +
    "hydrate trometamol arginine lysine dimesylate maleate monosodium usp bp ip"
  ).split(" ")
);

export type Ingredient = { key: string; name: string };

/** Split a generic name into normalized ingredients (deduped). */
export function ingredientsOf(genericName: string | null | undefined): Ingredient[] {
  if (!genericName) return [];
  const out = new Map<string, Ingredient>();
  const cleaned = genericName.replace(/\[[^\]]*\]/g, " ").replace(/\([^)]*\)/g, " ");
  for (const part of cleaned.split(/\s*\+\s*|\s*&\s*|,\s*/)) {
    const words = part.trim().split(/\s+/).filter(Boolean);
    // Strip salt words, but never the first word ("Calcium Carbonate", "Sodium Chloride" stay intact)
    const kept = words.filter((w, i) => i === 0 || !SALTS.has(w.toLowerCase()));
    const name = kept.join(" ").trim();
    const key = name.toLowerCase();
    if (key.length >= 4 && /[a-z]/.test(key)) out.set(key, { key, name });
  }
  return [...out.values()];
}

const MINERALS = new Set(["calcium", "magnesium", "aluminium", "aluminum", "iron", "ferrous", "zinc"]);
const CATIONS = new Set(["sodium", "potassium", "calcium", "magnesium", "ferrous", "lithium"]);
const ANIONS = new Set(["chloride", "carbonate", "bicarbonate", "citrate", "phosphate", "sulfate", "sulphate", "gluconate", "lactate", "acetate", "oxide", "hydroxide", "fumarate"]);
const ORAL_SALTS = new Set(["hydroxide", "carbonate", "trisilicate", "oxide", "sulfate", "sulphate", "gluconate", "lactate", "citrate", "fumarate", "phosphate", "glycinate", "bisglycinate", "polymaltose", "sucrose", "orotate", "aspartate"]);
const VAGUE_FIRST = new Set(["vitamin", "insulin", "human", "folic", "ascorbic", "sodium", "potassium", "calcium", "magnesium", "aluminium", "aluminum", "ferrous", "zinc", "iron", "lithium", "oral", "compound", "combined"]);
const NOISY = new Set(["grape", "dates", "basil", "aloe", "sana", "gags", "dinar", "salep", "neem", "tulsi", "honey", "water", "sugar", "milk"]);

/**
 * Words that identify this ingredient in label prose (lowercase, word-boundary matched).
 * "olmesartan medoxomil" → [olmesartan medoxomil, olmesartan]; "sodium valproate" → [sodium valproate, valproate];
 * "aluminium hydroxide" → [aluminium hydroxide, aluminium] (labels say "aluminium-containing antacids").
 */
export function matchTerms(key: string): string[] {
  if (NOISY.has(key)) return [];
  const words = key.split(" ");
  const terms = new Set([key]);
  if (words.length > 1) {
    const [first] = words;
    const last = words[words.length - 1];
    if (!VAGUE_FIRST.has(first) && first.length >= 6) terms.add(first);
    if (CATIONS.has(first) && !ANIONS.has(last) && last.length >= 6) terms.add(last);
    // "magnesium/aluminium/iron-containing antacids/supplements" → only oral salts, not e.g. topical aluminium chloride
    if (MINERALS.has(first) && ORAL_SALTS.has(last)) terms.add(first === "ferrous" ? "iron" : first);
  }
  // UK/US spellings used interchangeably in labels
  for (const t of [...terms]) {
    if (t.includes("aluminium")) terms.add(t.replace("aluminium", "aluminum"));
    if (t.includes("sulphate")) terms.add(t.replace("sulphate", "sulfate"));
  }
  return [...terms].filter((t) => t.length >= 4);
}

/** Stable pair key, order-independent: pairKey("warfarin","aspirin") === pairKey("aspirin","warfarin") */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
