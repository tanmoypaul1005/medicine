/** npm run test:search — runs tests/search-cases.json against the running dev server's /api/autocomplete. */
import fs from "node:fs";
import type { MedicineHit } from "@/lib/search/types";

type Case = { q: string; top3Brand?: string; top3Strength?: string; top3Generic?: string; empty?: boolean };

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const cases: Case[] = JSON.parse(fs.readFileSync("tests/search-cases.json", "utf8"));

async function main() {
  let failed = 0;
  for (const c of cases) {
    const res = await fetch(`${BASE}/api/autocomplete?q=${encodeURIComponent(c.q)}`);
    const { data } = (await res.json()) as { data: MedicineHit[] };
    const top = data.slice(0, 3);
    const ok = c.empty
      ? data.length === 0
      : top.some(
          (h) =>
            (!c.top3Brand || h.brand === c.top3Brand) &&
            (!c.top3Strength || h.strength === c.top3Strength) &&
            (!c.top3Generic || h.genericName === c.top3Generic)
        );
    if (!ok) failed++;
    console.log(`${ok ? "✔" : "✘"} ${c.q.padEnd(14)} → ${top.map((h) => `${h.brand} ${h.strength ?? ""}`).join(" | ") || "(none)"}`);
  }
  console.log(failed ? `\n${failed}/${cases.length} failed` : `\nAll ${cases.length} passed`);
  process.exitCode = failed ? 1 : 0;
}

main();
