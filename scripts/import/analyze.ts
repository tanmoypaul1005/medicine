/** npm run db:analyze -- <name>   (name = file in data/raw without .csv) → per-column stats */
import { loadCsv } from "./lib/csv";

const name = process.argv[2];
if (!name) throw new Error("Usage: npm run db:analyze -- medicine");
const rows = loadCsv(name);
const header = Object.keys(rows[0] ?? {});
console.log(`${name}: ${rows.length} rows, ${header.length} cols`);
for (const h of header) {
  const filled = rows.map((r) => r[h]).filter(Boolean);
  const uniq = new Set(filled);
  const maxLen = Math.max(0, ...filled.map((v) => v.length));
  const samples = [...uniq].slice(0, 3).map((v) => JSON.stringify(v.length > 60 ? v.slice(0, 60) + "…" : v));
  console.log(`- ${h}: filled ${((filled.length / rows.length) * 100).toFixed(1)}%, uniq ${uniq.size}, maxLen ${maxLen} | ${samples.join(" | ")}`);
}
