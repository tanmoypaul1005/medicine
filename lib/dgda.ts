/**
 * DGDA registry matching helpers (shared by the sync script and the service).
 * Source: DGHS national terminology server (OCL) — org MoHFW, source "DGDA-Drugs" (public, read-only).
 */

export const DGDA_API = "https://tr.ocl.dghs.gov.bd/api/orgs/MoHFW/sources/DGDA-Drugs";
export const DGDA_BROWSE = "https://tr.ocl.dghs.gov.bd/";

const STRENGTH_TAIL = /[\s\-_/]*\d+(?:\.\d+)?\s*(?:mg|mcg|gm|g|ml|iu|%)?$/i;
// DGDA trade names sometimes end with the form: "A-Cof Syrup", "Xyz Eye Drops".
const FORM_TAIL =
  /[\s\-_/]+(?:tablets?|tab|capsules?|cap|syrup|suspension|susp|injection|inj|infusion|cream|ointment|oint|gel|lotion|drops?|eye drops|ear drops|nasal drops|nasal spray|spray|inhaler|solution|powder|sachet|suppository|elixir)$/i;

/** "Aspra-40" → "aspra", "A-Cof Syrup" → "acof", "Ace Plus" → "aceplus", "G-Paracetamol" → "gparacetamol". */
export function brandKey(name: string): string {
  let s = name.normalize("NFKD").toLowerCase().trim();
  for (let i = 0; i < 4; i++) {
    const next = s.replace(STRENGTH_TAIL, "").replace(FORM_TAIL, "").trim();
    if (next === s || !next) break;
    s = next;
  }
  return s.replace(/[^a-z0-9]/g, "");
}

/** Base brand without a suffix word: "Adonid DS" → "adonid", "Admira MR" → "admira"; null if single word. */
export function baseBrandKey(name: string): string | null {
  const first = name.trim().split(/\s+/)[0] ?? "";
  if (first.length === name.trim().length) return null;
  const k = brandKey(first);
  return k.length >= 3 ? k : null;
}

const COMPANY_NOISE = new Set([
  "ltd", "limited", "plc", "pharmaceuticals", "pharmaceutical", "pharma", "industries", "industry",
  "inc", "co", "company", "bangladesh", "bd", "the", "and", "laboratories", "laboratory", "labs", "lab",
]);

/** Significant lowercase words of a company name ("Advanced Chemical Industries PLC." → ["advanced","chemical"]). */
function companyWords(name: string): string[] {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w && !COMPANY_NOISE.has(w));
}

/** First significant word, e.g. "beximco", "square", "aci". */
export function companyKey(name: string): string {
  return companyWords(name)[0] ?? "";
}

/** Same company? First words equal, or one is the other's initials (ACI ↔ Advanced Chemical Industries). */
export function sameCompany(a: string, b: string): boolean {
  const wa = companyWords(a);
  const wb = companyWords(b);
  if (!wa.length || !wb.length) return false;
  if (wa[0] === wb[0]) return true;
  const initials = (n: string) => n.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w && !["ltd", "limited", "plc", "the", "and"].includes(w)).map((w) => w[0]).join("");
  return initials(a) === wb[0] || initials(b) === wa[0];
}

/** First number in a strength / content string: "Omeprazole 40 mg" → "40", "500 mg + 65 mg" → "500". */
export function firstNumber(s: string | null | undefined): string | null {
  const m = /\d+(?:\.\d+)?/.exec(s ?? "");
  return m ? String(Number(m[0])) : null;
}

/** DAR numbers look like "341-0160-020"; user input may lack dashes. */
export const DAR_INPUT = /^[0-9][0-9\s-]{5,20}$/;
export const darKey = (s: string) => s.replace(/[^0-9]/g, "");
