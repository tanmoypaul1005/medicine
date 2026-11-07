import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import type { ScanItem, ScanResult } from "@/lib/scan/types";
import type { MedicineHit } from "@/lib/search/types";
import { autocomplete } from "./search.service";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
const MAX_ITEMS = 15;

let client: GoogleGenAI | null = null;
function gemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return (client ??= new GoogleGenAI({ apiKey }));
}

const INSTRUCTIONS = `You read photos of doctors' prescriptions from Bangladesh (printed or handwritten, English or Bangla).
Extract ONLY the medicines prescribed. For each medicine return:
- name: the brand (or generic) name exactly as written, without the form prefix (e.g. "Napa", "Seclo", "Monas").
- strength: e.g. "500 mg", "20 mg", "10 mg", "5 ml" — omit if not written.
- form: expand abbreviations: Tab→tablet, Cap→capsule, Syp/Syr→syrup, Susp→suspension, Inj→injection, Drop→drops, Oint→ointment, Cr→cream, Supp→suppository — omit if not written.
- written: the medicine line as it appears (e.g. "Tab. Napa 500mg").
- confidence: "high" if clearly legible, "low" if you are guessing any letters.
Rules: Do NOT extract patient name, age, phone, diagnosis, tests, advice or dosage schedules. Do NOT invent medicines.
If the image is not a prescription or medicine list, set isPrescription to false and return no items.`;

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isPrescription: { type: Type.BOOLEAN },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          strength: { type: Type.STRING },
          form: { type: Type.STRING },
          written: { type: Type.STRING },
          confidence: { type: Type.STRING, enum: ["high", "low"] },
        },
        required: ["name", "written", "confidence"],
      },
    },
  },
  required: ["isPrescription", "items"],
};

type Extracted = { name: string; strength?: string; form?: string; written: string; confidence: "high" | "low" };

async function extract(image: Buffer, mimeType: string): Promise<{ isPrescription: boolean; items: Extracted[] }> {
  const res = await gemini().models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ inlineData: { mimeType, data: image.toString("base64") } }, { text: INSTRUCTIONS }] }],
    config: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0 },
  });
  const parsed = JSON.parse(res.text ?? "{}") as { isPrescription?: boolean; items?: Extracted[] };
  const items = (parsed.items ?? [])
    .filter((i) => typeof i?.name === "string" && i.name.trim())
    .slice(0, MAX_ITEMS)
    .map((i) => ({ ...i, name: i.name.trim().slice(0, 60), written: String(i.written ?? i.name).slice(0, 120) }));
  return { isPrescription: parsed.isPrescription === true, items };
}

// ---------- Matching extracted text → our medicines ----------
const FORM_HINTS: Record<string, RegExp> = {
  tablet: /tablet/i,
  capsule: /capsule/i,
  syrup: /syrup|suspension|solution|elixir/i,
  suspension: /suspension|syrup/i,
  injection: /injection|infusion/i,
  drops: /drops/i,
  ointment: /ointment|cream|gel/i,
  cream: /cream|ointment|gel/i,
  suppository: /suppository/i,
};
const digits = (s?: string | null) => (s ?? "").match(/\d+(\.\d+)?/g)?.join("|") ?? "";

function score(c: MedicineHit, e: Extracted): number {
  let s = 0;
  if (c.brand.toLowerCase() === e.name.toLowerCase()) s += 3;
  else if (c.genericName?.toLowerCase().startsWith(e.name.toLowerCase())) s += 1.5;
  const want = digits(e.strength);
  if (want && digits(c.strength).split("|")[0] === want.split("|")[0]) s += 2;
  const hint = e.form ? FORM_HINTS[e.form.toLowerCase()] : undefined;
  if (hint?.test(c.dosageForm)) s += 1;
  return s;
}

async function match(e: Extracted): Promise<ScanItem> {
  const hits = await autocomplete(`${e.name} ${e.strength ?? ""}`.trim());
  const ranked = hits.map((c) => ({ c, s: score(c, e) })).sort((a, b) => b.s - a.s);
  const best = ranked[0];
  return {
    written: e.written,
    confidence: e.confidence,
    candidates: ranked.slice(0, 5).map((r) => r.c),
    selected: best ? best.c.slug : null,
    sure: !!best && best.s >= 5 && e.confidence === "high", // brand + strength agree, legible
  };
}

/** Read a prescription image (never stored) and match each medicine. */
export async function scanPrescription(image: Buffer, mimeType: string): Promise<ScanResult> {
  const { isPrescription, items } = await extract(image, mimeType);
  if (!isPrescription) return { isPrescription: false, items: [] };
  return { isPrescription: true, items: await Promise.all(items.map(match)) };
}
