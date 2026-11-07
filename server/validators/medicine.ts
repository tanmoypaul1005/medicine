import { z } from "zod";

export const MEDICINE_SORTS = ["brand", "price-asc", "price-desc"] as const;
export const MEDICINE_PAGE_SIZE = 50;

// Lenient: bad/missing params fall back to defaults instead of erroring (URL is user-editable).
export const medicineListQuery = z.object({
  q: z.string().trim().max(60).catch("").default(""),
  type: z.enum(["all", "allopathic", "herbal"]).catch("all").default("all"),
  sort: z.enum(MEDICINE_SORTS).catch("brand").default("brand"),
  page: z.coerce.number().int().min(1).max(10_000).catch(1).default(1),
});

export type MedicineListQuery = z.infer<typeof medicineListQuery>;

/** Next searchParams values can be string | string[]; take the first. */
export function firstParams(sp: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
}
