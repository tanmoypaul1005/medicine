/**
 * Mine ingredient-level interactions from Generic.sections.interaction (label text).
 *   npm run db:interactions:dry   stats + samples, no writes
 *   npm run db:interactions       replace all mined interactions (idempotent)
 * Conservative by design: verbatim evidence only, negated sentences skipped, severity only from explicit wording.
 */
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { ingredientsOf, matchTerms, pairKey } from "@/lib/ingredients";
import { Generic, Interaction } from "@/models";
import { DRUG_CLASSES } from "./lib/drugClasses";
import { htmlSentences as sentences } from "./lib/transform";

const DRY = process.argv.includes("--dry");
const SOURCE = "medex.com.bd prescribing information (interaction section)";
const MAX_EVIDENCE = 4;

// Sentence says there is NO interaction → never use it as evidence.
const NEGATION =
  /\bno (known |clinically |significant |clinically significant |relevant |evidence of (an |any )?)*(drug[- ])?interactions?\b|\bno evidence\b|\bdo(es)? not (significantly |appear to )?(affect|interact|alter|influence|change)\b|\bnot (been )?(shown|found|reported|known) to (interact|affect)\b|\bwithout (any )?(significant )?(interaction|effect)\b|\bno (significant |clinically relevant )?(effect|change|influence)\b|\bnot (clinically )?significant\b/i;
// Explicit "avoid" wording in the label → warning. Everything else that names a drug → caution.
const WARNING =
  /contraindicat|should not be (used|taken|given|co-?administered|combined)|must not|do not (use|take|co-?administer|combine)|\bavoid(ed|ance)?\b|not recommended|fatal|life[- ]threatening|serious|severe/i;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type Evidence = { genericName: string; genericSlug: string; text: string; via?: string };
type Acc = { a: string; b: string; aName: string; bName: string; severity: "warning" | "caution"; evidence: Evidence[] };

async function main() {
  const t0 = Date.now();
  await connectDB();
  const generics = await Generic.find().select("name slug sections.interaction").lean();

  // Ingredient index: key → display name, term → keys
  const names = new Map<string, string>();
  for (const g of generics) for (const i of ingredientsOf(g.name)) if (!names.has(i.key)) names.set(i.key, i.name);
  const termKeys = new Map<string, Set<string>>();
  for (const key of names.keys()) for (const term of matchTerms(key)) termKeys.set(term, (termKeys.get(term) ?? new Set()).add(key));
  // Word-boundary match that ignores lab values and class words: "serum potassium", "potassium levels",
  // "dopamine antagonists", "calcium channel blockers" are not the ingredient itself.
  const BEFORE = "(?<!serum |plasma |blood |urinary |urine |intracellular |dietary )";
  const AFTER =
    "(?![a-z])(?!\\s+(levels?|concentrations?|excretion|deficiency|depletion|loss|antagonists?|agonists?|receptors?|channel|reuptake|metabolism|balance|homeostasis|status|values?)\\b)";
  const terms = [...termKeys.entries()].map(([term, keys]) => ({
    term,
    keys,
    re: new RegExp(`${BEFORE}(?<![a-z])${escapeRegex(term)}${AFTER}`, "i"),
  }));
  console.log(`ingredients ${names.size}, match terms ${terms.length}`);

  // Class rules → member ingredient keys that exist in our data
  const classes = DRUG_CLASSES.map((c) => {
    const keys = c.members.filter((m) => names.has(m));
    const missing = c.members.filter((m) => !names.has(m));
    if (missing.length) console.log(`  class "${c.label}": not in data → ${missing.join(", ")}`);
    return { ...c, keys };
  });

  const acc = new Map<string, Acc>();
  let used = 0, negated = 0;
  for (const g of generics) {
    const html = g.sections?.interaction;
    if (!html) continue;
    const own = ingredientsOf(g.name);
    if (!own.length) continue;
    for (const s of sentences(html)) {
      if (NEGATION.test(s)) {
        negated++;
        continue;
      }
      const lower = s.toLowerCase();
      const hits = new Set<string>();
      for (const t of terms) if (lower.includes(t.term) && t.re.test(s)) t.keys.forEach((k) => hits.add(k));
      // Class mentions: direct name hits win; class-only hits remember the class phrase
      const via = new Map<string, string>();
      for (const c of classes) {
        // "Diclofenac, like other NSAIDs, …" describes the subject itself → not an interacting class
        if (own.some((o) => c.keys.includes(o.key)) || !c.phrase.test(s)) continue;
        // Sentence already names a specific member ("anticoagulant effect of warfarin") → don't widen to the class
        if (c.keys.some((k) => hits.has(k))) continue;
        for (const k of c.keys) if (!hits.has(k) && !via.has(k)) via.set(k, c.label);
      }
      // Combination generics: attribute the sentence only to own ingredients it names
      const subjects = own.length === 1 ? own : own.filter((o) => hits.has(o.key));
      // Not "another drug": same key, or a variant of it ("calcium" vs "calcium carbonate")
      const related = (x: string, y: string) => x === y || x.startsWith(`${y} `) || y.startsWith(`${x} `);
      const others = [...hits, ...via.keys()].filter((k) => !own.some((o) => related(o.key, k)));
      if (!subjects.length || !others.length) continue;
      used++;
      const severity = WARNING.test(s) ? "warning" : "caution";
      for (const subj of subjects) {
        for (const other of others) {
          const pk = pairKey(subj.key, other);
          const [a, b] = pk.split("|");
          const cur = acc.get(pk) ?? { a, b, aName: names.get(a)!, bName: names.get(b)!, severity: "caution", evidence: [] };
          if (severity === "warning") cur.severity = "warning";
          if (cur.evidence.length < MAX_EVIDENCE && !cur.evidence.some((e) => e.text === s)) {
            const ev: Evidence = { genericName: g.name, genericSlug: g.slug, text: s };
            if (via.has(other)) ev.via = via.get(other);
            cur.evidence.push(ev);
          }
          acc.set(pk, cur);
        }
      }
    }
  }

  const docs = [...acc.entries()].map(([pk, v]) => ({ pairKey: pk, ...v, source: SOURCE }));
  const warn = docs.filter((d) => d.severity === "warning").length;
  console.log(`sentences used ${used}, negated skipped ${negated}`);
  console.log(`pairs ${docs.length} (warning ${warn}, caution ${docs.length - warn})`);
  console.log(`  of which class-only: ${docs.filter((d) => d.evidence.every((e) => e.via)).length}`);
  for (const pk of ["omeprazole|warfarin", "omeprazole|theophylline", "ciprofloxacin|magnesium hydroxide", "aspirin|warfarin", "ibuprofen|warfarin", "diclofenac|ibuprofen", "fluoxetine|selegiline", "paracetamol|warfarin"]) {
    const d = acc.get(pk);
    const e = d?.evidence[0];
    console.log(`  ${pk}: ${d ? `${d.severity}${e?.via ? ` [via ${e.via}]` : ""} — "${e?.text.slice(0, 120)}…"` : "(none)"}`);
  }

  if (DRY) {
    console.log(`Dry run done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    return;
  }
  await Interaction.syncIndexes(); // drops the old {genericA, genericB} unique index
  await Interaction.deleteMany({ source: SOURCE });
  for (let i = 0; i < docs.length; i += 1000) await Interaction.insertMany(docs.slice(i, i + 1000), { ordered: false });
  console.log(`Wrote ${docs.length} interactions in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
