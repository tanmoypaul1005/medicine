/**
 * npm run images:sync [-- --limit=100 | --all] [--first=napa,seclo] [--approve] [--refresh-sitemap]
 * One command for the whole image import: sitemap → match → upload → (approve) → revalidate.
 *   --limit=N           new arogga pages to fetch this run (default 100); --all = every sure match (hours)
 *   --first=a,b         brands to fetch first
 *   --approve           also approve everything imported, WITHOUT a human look at the pictures
 *   --refresh-sitemap   re-download arogga's product list (otherwise reused when it exists)
 * Without --approve the new images stay hidden until `npm run images:approve`.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { PRODUCTS_FILE } from "./lib";

const args = process.argv.slice(2);
const has = (flag: string) => args.includes(flag);
const pass = (...names: string[]) => args.filter((a) => names.some((n) => a === `--${n}` || a.startsWith(`--${n}=`)));

function step(title: string, script: string, extra: string[] = []) {
  console.log(`\n=== ${title} ===`);
  const cmd = ["npm", "run", script, ...(extra.length ? ["--", ...extra] : [])].join(" ");
  const res = spawnSync(cmd, { stdio: "inherit", shell: true });
  if (res.status !== 0) throw new Error(`"${cmd}" failed (exit ${res.status})`);
}

async function revalidate() {
  const base = process.env.REVALIDATE_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-revalidate-secret": process.env.REVALIDATE_SECRET ?? "" },
      body: JSON.stringify({ tags: ["medicines"] }),
      signal: AbortSignal.timeout(20_000),
    });
    console.log(res.ok ? `Cache refreshed on ${base} (reload a page twice to see new images).` : `Revalidate on ${base} answered ${res.status}.`);
  } catch {
    console.log(`Could not reach ${base} to refresh the cache. Do it yourself: POST /api/revalidate {"tags":["medicines"]}`);
  }
}

async function main() {
  if (has("--refresh-sitemap") || !fs.existsSync(PRODUCTS_FILE)) step("1/4 arogga product list", "images:sitemap");
  else console.log(`\n=== 1/4 arogga product list: reusing ${PRODUCTS_FILE} (--refresh-sitemap to update) ===`);

  step("2/4 match + fetch pages (dry run)", "images:match", pass("limit", "all", "first"));
  step("3/4 upload to Cloudinary", "images:upload", ["--confirm"]);

  if (has("--approve")) {
    step("4/4 approve", "images:approve", ["--all"]);
    await revalidate();
  } else {
    console.log('\n=== 4/4 approve: skipped ===\nNew images are hidden. Look at them in Cloudinary, then run "npm run images:approve -- --all".');
  }
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exitCode = 1;
});
