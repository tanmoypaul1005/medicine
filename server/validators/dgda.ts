import { z } from "zod";

/** /verify?q= — brand name or DAR number. Lenient: invalid → "". */
export const verifyQuery = z.object({
  q: z
    .string()
    .catch("")
    .default("")
    .transform((v) => v.normalize("NFC").replace(/[$<>{}]/g, "").replace(/\s+/g, " ").trim().slice(0, 60)),
});
