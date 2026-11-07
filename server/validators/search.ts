import { z } from "zod";

export const SEARCH_PAGE_SIZE = 20;
export const AUTOCOMPLETE_LIMIT = 8;

const q = z.string().trim().max(60);

/** Strict, for API routes (bad input → 400). */
export const autocompleteParams = z.object({ q: q.min(1) });
export const searchParamsSchema = z.object({
  q: q.min(1),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

/** Lenient, for the /search page (URL is user-editable; fall back instead of erroring). */
export const searchPageQuery = z.object({
  q: q.catch("").default(""),
  page: z.coerce.number().int().min(1).max(500).catch(1).default(1),
});
