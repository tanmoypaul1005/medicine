import { z } from "zod";

export const MAX_CHECK_ITEMS = 8;
const SLUG = /^[a-z0-9-]{1,120}$/;

/** "?m=napa-500-mg-tablet,seclo-20-mg-capsule" → unique valid slugs (max 8). Lenient: bad entries are dropped. */
export const interactionQuery = z.object({
  m: z
    .string()
    .catch("")
    .default("")
    .transform((v) =>
      [...new Set(v.split(",").map((s) => s.trim().toLowerCase()).filter((s) => SLUG.test(s)))].slice(0, MAX_CHECK_ITEMS)
    ),
});
