import { z } from "zod";

export const MAX_CHECK_ITEMS = 8;
export const MAX_SCAN_ITEMS = 15;
const SLUG = /^[a-z0-9-]{1,120}$/;

/** "?m=a,b" → unique valid medicine slugs (max N). Lenient: bad entries are dropped. */
export const slugListQuery = (max: number) =>
  z.object({
    m: z
      .string()
      .catch("")
      .default("")
      .transform((v) => [...new Set(v.split(",").map((s) => s.trim().toLowerCase()).filter((s) => SLUG.test(s)))].slice(0, max)),
  });

export const interactionQuery = slugListQuery(MAX_CHECK_ITEMS);

export const MAX_COST_ITEMS = 10;
export const MAX_COST_QTY = 100;

/** Cost calculator "?m=slug:qty,slug" → [{slug, qty}] (qty default 1, 0–100, 2 decimals). Lenient: bad entries dropped. */
export const costQuery = z.object({
  m: z
    .string()
    .catch("")
    .default("")
    .transform((v) => {
      const out = new Map<string, number>();
      for (const part of v.split(",")) {
        const [rawSlug, rawQty] = part.split(":");
        const slug = rawSlug?.trim().toLowerCase() ?? "";
        if (!SLUG.test(slug) || out.has(slug)) continue;
        const n = rawQty === undefined ? 1 : Number(rawQty);
        out.set(slug, Number.isFinite(n) ? Math.round(Math.min(Math.max(n, 0), MAX_COST_QTY) * 100) / 100 : 1);
      }
      return [...out].slice(0, MAX_COST_ITEMS).map(([slug, qty]) => ({ slug, qty }));
    }),
});
export const scanResultQuery = slugListQuery(MAX_SCAN_ITEMS);
