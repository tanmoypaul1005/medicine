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
export const scanResultQuery = slugListQuery(MAX_SCAN_ITEMS);
