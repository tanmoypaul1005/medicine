import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connectDB } from "@/lib/db";
import { brandKey, DAR_INPUT, darKey, firstNumber, sameCompany } from "@/lib/dgda";
import { bnToLatin, hasBangla } from "@/lib/search/bnTranslit";
import { DgdaDrug } from "@/models";

// DGDA registration lookup against the local snapshot (`npm run db:sync-dgda`). Cache tag "dgda".
// Wording rule: "registered" / "not found in the list" — NEVER "genuine" or "fake" (a counterfeit
// pack carries the same name and DAR; a miss can be a spelling/company-name mismatch).

export type DgdaEntry = {
  darNumber: string | null;
  tradeName: string;
  company: string | null;
  dosageForm: string | null;
  genericContent: string | null;
};

export type DgdaStatus =
  | { status: "registered"; entry: DgdaEntry; exactStrength: boolean; syncedAt: string }
  | { status: "notFound"; syncedAt: string }
  | { status: "noData" };

const SELECT = "darNumber tradeName company dosageForm genericContent strengthNum";
const toEntry = (d: DgdaEntry): DgdaEntry => ({
  darNumber: d.darNumber ?? null,
  tradeName: d.tradeName,
  company: d.company ?? null,
  dosageForm: d.dosageForm ?? null,
  genericContent: d.genericContent ?? null,
});

/** Last sync time (ISO) or null when the registry was never synced. */
export async function dgdaSyncedAt(): Promise<string | null> {
  "use cache";
  cacheLife("days");
  cacheTag("dgda");
  await connectDB();
  const last = await DgdaDrug.findOne().sort({ syncedAt: -1 }).select("syncedAt").lean();
  return last?.syncedAt ? new Date(last.syncedAt).toISOString() : null;
}

const formWord = (s: string | null | undefined) => (s ?? "").toLowerCase().match(/[a-z]+/)?.[0] ?? "";

/** Is this medicine (brand + manufacturer) in the DGDA list? Best entry = same strength, then same form. */
export async function getDgdaStatus(m: {
  brand: string;
  manufacturerName: string | null;
  strength: string | null;
  dosageForm: string;
}): Promise<DgdaStatus> {
  "use cache";
  cacheLife("days");
  cacheTag("dgda");
  const syncedAt = await dgdaSyncedAt();
  if (!syncedAt) return { status: "noData" };
  if (!m.manufacturerName) return { status: "notFound", syncedAt };

  await connectDB();
  const rows = await DgdaDrug.find({ brandKey: brandKey(m.brand) }).select(SELECT).limit(200).lean();
  const mine = rows.filter((r) => r.company && sameCompany(r.company, m.manufacturerName as string));
  if (!mine.length) return { status: "notFound", syncedAt };

  const wantN = firstNumber(m.strength);
  const wantForm = formWord(m.dosageForm);
  const score = (r: (typeof mine)[number]) =>
    (wantN && r.strengthNum === wantN ? 2 : 0) + (wantForm && m.dosageForm.toLowerCase().includes(formWord(r.dosageForm)) ? 1 : 0);
  const best = mine.reduce((a, b) => (score(b) > score(a) ? b : a));
  return {
    status: "registered",
    entry: toEntry(best as DgdaEntry),
    exactStrength: !!wantN && best.strengthNum === wantN,
    syncedAt,
  };
}

/** /verify search: a DAR number (digits, dashes optional) or a brand name (prefix). */
export async function searchDgda(q: string): Promise<DgdaEntry[]> {
  "use cache";
  cacheLife("days");
  cacheTag("dgda");
  const query = hasBangla(q) ? bnToLatin(q).trim() : q.trim(); // "নাপা" → "napa"
  if (query.length < 2) return [];
  await connectDB();

  const digits = darKey(query);
  let filter: Record<string, RegExp>;
  if (DAR_INPUT.test(query) && digits.length >= 6) filter = { darKey: new RegExp(`^${digits}`) };
  else {
    const key = brandKey(query); // only [a-z0-9] → safe in a regex
    if (key.length < 2) return [];
    filter = { brandKey: new RegExp(`^${key}`) };
  }

  const rows = await DgdaDrug.find(filter).sort({ tradeName: 1, darNumber: 1 }).limit(50).select(SELECT).lean();
  return rows.map((r) => toEntry(r as DgdaEntry));
}
