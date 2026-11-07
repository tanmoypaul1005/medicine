# MedicineMate — AI Context

> Read this first. Keep it short and current: after any task that changes structure, conventions, models, APIs, env vars or status, update the relevant section (and tick Status). No long prose; facts only.

## What
Bangladesh medicine helper web app: search any medicine (brand/generic/Bangla/typo), see price, cheaper alternatives (same generic+strength+form), warnings, drug interactions, prescription scan (Gemini Vision OCR). Info only, never medical advice; every medicine/alt/interaction/scan/condition page shows `<Disclaimer />`. Symptom→medicine ONLY via the curated conditions guide (`docs/conditions-feature.md`): OTC allow-list per condition, label evidence required, red flags first, no dosing; never antibiotics/steroids/sedatives/controlled/Rx-only.

## Stack
Next.js 16.4 (App Router, Turbopack, `cacheComponents` ON), React 19, TS strict, Tailwind 4 (tokens in `app/globals.css`), lucide-react, RTK Query, Zod, Mongoose → MongoDB Atlas (db `medicinecheck`). Planned: Atlas Search, Auth.js, Cloudinary, Gemini, Upstash Redis, Vercel. No Shadcn yet (plain Tailwind + `cn()`).

## i18n (bn default, en)
- URL-based: `app/[lang]/` is the root layout (no `app/layout.tsx`). `proxy.ts` redirects un-prefixed paths → `/bn|/en` (cookie `NEXT_LOCALE` → Accept-Language → bn). `/api` is not localized.
- Strings: `lib/i18n/dictionaries/bn.ts` (source of truth, defines `Dictionary` type) + `en.ts` (must match). Server: `getDictionary(lang)`; pass the needed slice to client components as props (no client i18n lib).
- Links: always `href(lang, "/path")` from `lib/i18n/config.ts`. Pages: `const { lang } = await params; if (!hasLocale(lang)) notFound();`
- New UI text → add to BOTH dictionaries.

## Structure
- `app/[lang]/(public)/` public pages (`page.tsx` = home); `app/api/*/route.ts` Route Handlers
- `components/medicine/` SearchBar, Disclaimer, MedicineTable (filters/table/pagination/skeleton, server-only render)…; `components/layout/` SiteHeader/Footer
- Search: `server/services/search.service.ts` (`parseQuery` "napa 500"→text+strength; Bangla via `lib/search/bnTranslit.ts` + spelling variants k/c, j/g/z, ks/x, inherent "o"; Atlas `$search` index `medicine_search` (def in `models/Medicine.ts`, create with `npm run db:search-index`); regex fallback on error/0 hits; SearchLog on 0 hits). Shared client/server types in `lib/search/types.ts`. API: `/api/autocomplete?q=`, `/api/search?q=&page=`. Page `/[lang]/search` (noindex). Regression: `npm run test:search` (dev server must run; cases in `tests/search-cases.json`; add a case for every search fix).
- Medicine detail `/[lang]/medicine/[slug]`: `getMedicineDetail` (`server/services/medicineDetail.service.ts`, `"use cache"` + `cacheLife("hours")` + `cacheTag("medicine:<slug>")`) → header/price/packs, alternatives (same genericId+strength+formSlug, cheapest 15, savings only when same price basis), brand variants, generic sections (`components/medicine/MedicineDetailView.tsx`, HTML in `.med-html` styles in globals.css). `generateStaticParams` prerenders a few popular slugs; page awaits params + data outside Suspense so unknown slug = real 404.
- Interaction checker `/[lang]/interactions?m=slug1,slug2` (max 8): `checkInteractions` (`server/services/interaction.service.ts`) → per medicine pair: duplicate (same ingredient) > warning > caution > none. UI: `components/interactions/InteractionPicker.tsx` (client, URL state) + `InteractionResults.tsx` (server). API `GET /api/interactions?m=`.
- Conditions guide: `Condition` model ← `npm run db:conditions[:dry]` (`scripts/import/conditions.ts` + catalog `scripts/import/lib/conditionCatalog.ts`: names, aliases, red flags, label `terms`, OTC `allow` keys, `forms`). Generic qualifies only if ALL ingredients allowed + indication sentence matches + a brand in allowed form exists. `ALWAYS_EXCLUDED_FORMS` in `lib/conditions.ts`. Service `server/services/condition.service.ts` (`listConditions`/`getCondition` "use cache" tag `conditions`, `findConditions` whole-word alias match). Pages `/[lang]/conditions`, `/[lang]/condition/[slug]` (all prerendered); home chips (8 + native `<details>` "see more"); search page shows matching conditions. UI `components/conditions/ConditionViews.tsx`. 30 conditions, `reviewed:false` until clinician review.
- Cache refresh after scripts write DB: `scripts/lib/revalidate.ts` → `POST /api/revalidate` (`x-revalidate-secret`, tags). `revalidateTag(tag,"max")` = stale-while-revalidate: first request may still be old.
- Unbuilt features linked in header (`/scan`, `/account`) render `components/layout/ComingSoon.tsx` (200, noindex); replace when implementing.
- Pages: `/[lang]/medicines` (table: `q`, `type`, `sort`, `page` GET params → `medicineListQuery` → `listMedicines` in `server/services/medicine.service.ts`, 50/page)
- `models/` Mongoose models, all exported from `models/index.ts`
- `server/services/` all DB logic; `server/actions/` Server Actions; `server/validators/` Zod
- `store/` `medicineApi.ts` (RTK Query, baseUrl `/api`), `store.ts` (`makeStore`), `StoreProvider.tsx`
- `lib/db.ts` cached `connectDB()`; `lib/utils.ts` `cn`, `slugify`; `hooks/useDebounce.ts`
- `data/raw/*.csv` (git-ignored source dump), `data/ANALYSIS.md`
- `scripts/import/` (run via `tsx`, uses `@/models` + `@/lib/db`): `lib/csv.ts` (parser), `lib/transform.ts` (parsePrice, cleanHtml via sanitize-html, slugs), `run.ts`, `verify.ts`
- npm: `db:import:dry` (parse+validate, no DB), `db:import` (upsert by sourceId, never deletes, ~70s), `db:verify`

## Rules
- Route Handlers / Server Actions: validate with Zod → call `server/services/` → return `{ data, error }`. No direct DB queries in routes.
- Read-heavy data (search, autocomplete, medicine) = Route Handler; form mutations (save, report, admin edit) = Server Action.
- Server Components call services directly, never RTK Query.
- Every route calls `await connectDB()`; use `.lean()` + `select`.
- Secrets server-only (never `NEXT_PUBLIC_`). Strip `$`-prefixed keys from queries.
- No `any` except raw CSV rows. Ask the user when something is unclear; don't guess.

## Gotchas (already hit)
- `cacheComponents` ON: no `export const dynamic/revalidate` in routes; no `new Date()`/`Math.random()` during render of prerendered pages (use `"use cache"`, client component, or `await connection()`).
- Windows + Node 24: Atlas SRV lookup fails (`querySrv ECONNREFUSED`). Fixed via `.env` `MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1`, applied inside `connectDB()` (module-level call didn't reach page renders).
- Every displayed price needs its basis: `formatPrice(...)` + `priceBasis(priceLabel, t.perUnit)` → "প্রতি একক" or "/ 5 gm tube" (8k+ medicines are priced per tube/bottle). Select `priceLabel` in every price query.
- Counts in UI text: `formatNumber(lang, n)` (never `String(n)` → English digits in Bangla text). Prices: always `formatPrice(lang, n)` from `lib/format.ts` (bn "12 টাকা", en "৳12") — prices use English digits on both languages (user feedback: Bangla-digit prices hard to read; "৳১২" reads as 812). Savings % next to a price also English digits.
- Never `re.test()` with a `/g` regex in loops/filters (stateful `lastIndex` → skips matches).
- Dev HMR after adding a new export can SSR-fail once ("Element type is invalid… undefined", page shows `$RX` client fallback) → just reload.
- Mongoose calls `new Date()` internally → any uncached DB read in a page/component needs `await connection()` (from `next/server`) first, even after awaiting `searchParams`. Keep it in the page, not the service (services may be used under `"use cache"`).
- 404s: root layout is dynamic (`app/[lang]/layout.tsx`) → segment `notFound()`/`not-found.tsx` SSR-fails (`<html id="__next_error__">`, client reload loop). Use `app/global-not-found.tsx` (`experimental.globalNotFound`) for unmatched URLs, and `localizedNotFound(lang)` (`lib/i18n/notFound.ts`, redirects to `/<lang>/404`) inside pages. Never add `not-found.tsx` or a `[...rest]` catch-all under `[lang]`.
- Real 404 for dynamic `[slug]`: `generateStaticParams` + `export const instant = false` + await params/`"use cache"` data at page top level (not in Suspense, else soft 200).
- Pages reading `searchParams`/DB: put that part in an async child inside `<Suspense>` (pattern: `app/[lang]/(public)/medicines/page.tsx`). Services import `"server-only"`.
- eslint `react-hooks/refs`: no `ref.current` in render → `useState(makeStore)` in StoreProvider.
- RTK Query hooks (`useXQuery`) read `Date.now()` in render → any client component using them must render inside `<Suspense>` with a static fallback (pattern: `components/medicine/SearchBar.tsx`).
- Stale dev cache (old HTML after moves/renames): stop dev server, delete `.next`, restart, Ctrl+Shift+R. Don't run `next build` while dev is running.
- Redux `combineReducers` calls `Math.random()` → build `rootReducer` at module level in `store/store.ts` (never inside `makeStore`). Add new slices there.
- Scripts needing DB: `tsx --env-file=.env` (Next doesn't load `.env` outside the app). Mongoose 9: use `await doc.validate()`, not deprecated `validateSync()`.
- Shell: PowerShell 5.1 primary; bash heredocs unreliable here, so use the Write tool for files.
- User usually runs `npm run dev` on :3000 already; don't start a second server, just hit `http://localhost:3000`.

## Data model (key points)
- Source: medex.com.bd CSV dump, see `data/ANALYSIS.md`. All 3 core models have `sourceId` (CSV id) for idempotent upserts.
- Generic: name, slug, aliases[], drugClass, pregnancyCategory?, `sections.{indication,dosage,interaction,contraindications,sideEffects,pregnancyLactation,precautions,…}` (sanitized HTML, `GENERIC_SECTIONS`), monographUrl, brandCount. Warnings live on Generic, not brand. Render sections only via sanitized HTML.
- Medicine: brand, slug (own `slugify(brand strength form)`, `-<sourceId>` on clash), aliases[], type allopathic|herbal, genericId+genericName, manufacturerId+manufacturerName (denormalized for `$search`), strength?, dosageForm (exact string) + formSlug, unitPrice (per unit else cheapest pack; null = unavailable), priceLabel (null = per unit, else that pack's label "5 gm tube"), packs[{label,price,qty?,qtyPrice?}], priceText. Index `{genericId,strength,formSlug,unitPrice}`.
- No DosageForm/DrugClass/Indication collections; indication data never used for browsing (no symptom→medicine).
- Interaction: ingredient-level (`lib/ingredients.ts` `ingredientsOf`/`matchTerms`/`pairKey`), unique `pairKey` "a|b" sorted, `severity` warning|caution (warning only from explicit label wording: contraindicated/avoid/should not…), `evidence[]` = verbatim label sentences (+`via` when label named a drug class), `source` required. Mined by `npm run db:interactions[:dry]` (`scripts/import/interactions.ts`, class map `scripts/import/lib/drugClasses.ts`; negated sentences skipped; self-class and same-mineral pairs skipped). ~7.5k pairs. Missing pair = "তথ্য নেই", never "safe".
- Others: Manufacturer, User(role), Prescription, Report, SearchLog. Models are provisional until the CSV analysis.

## Env (`.env`)
`MONGODB_URI`, `MONGODB_DNS_SERVERS`, `REVALIDATE_SECRET` (scripts → `/api/revalidate`), optional `APP_URL` (default `http://localhost:3000`). Planned: `GEMINI_API_KEY`, `CLOUDINARY_*`, `AUTH_*`, `UPSTASH_*`.

## Status
- [x] Project setup, deps, folder structure
- [x] Mongoose connection + 8 models + `/api/health`
- [x] Homepage UI (search bar w/ autocomplete UI, scan CTA, popular list static, features, disclaimer)
- [x] bn/en i18n (URL-based, header toggle); homepage, header, footer translated
- [x] CSV → `data/ANALYSIS.md` → finalize Generic/Medicine/Manufacturer models
- [x] `scripts/import` + data imported to Atlas (240 mfr, 1,711 generics, 21,714 medicines; verify passes)
- [x] `/medicines` browse table (regex filter for now)
- [x] Atlas Search index + `/api/search`, `/api/autocomplete`, `/search` page, Bangla search (22/22 cases)
- [ ] Search ranking among same-brand variants (needs `popularity`; currently tie → brand A–Z), rate limit (Upstash)
- [x] `/medicine/[slug]` (cached, SEO metadata, alternatives + savings, warnings, real 404)
- [ ] `/generic/[slug]` (generic links currently go to `/search?q=<generic>`)
- [x] Warnings (medicine page) + `/interactions` checker (label-mined data)
- [x] Common conditions guide (30 conditions, OTC-only, label evidence) — [ ] clinician review of red flags + allow-lists before launch
- [ ] Better interaction source (e.g. DDInter/DrugBank, license check) — current data misses pairs whose labels don't mention each other (e.g. warfarin + ciprofloxacin)
- [ ] Auth.js, account, save/report (Server Actions)
- [ ] `/scan` (Cloudinary signed upload → Gemini → match → alternatives + interactions)
- [ ] Admin panel, rate limits, Lighthouse, deploy
