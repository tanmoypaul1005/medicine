# MedicineMate — AI Context

> Read this first. Keep it short and current: after any task that changes structure, conventions, models, APIs, env vars or status, update the relevant section (and tick Status). No long prose; facts only.

## What
Bangladesh medicine helper web app: search any medicine (brand/generic/Bangla/typo), see price, cheaper alternatives (same generic+strength+form), warnings, drug interactions, prescription scan (Gemini Vision OCR). Info only, never medical advice; every medicine/alt/interaction/scan/condition page shows `<Disclaimer />`. Symptom→medicine ONLY via the curated conditions guide (`docs/conditions-feature.md`): OTC allow-list per condition, label evidence required, red flags first, no dosing; never antibiotics/steroids/sedatives/controlled/Rx-only.

## Stack
Next.js 16.4 (App Router, Turbopack, `cacheComponents` ON), React 19, TS strict, Tailwind 4 (tokens in `app/globals.css`), lucide-react, RTK Query, Zod, Mongoose → MongoDB Atlas (db `medicinecheck`) + Atlas Search, Gemini (`@google/genai`). Planned: Auth.js, Upstash Redis, Vercel. No Shadcn yet (plain Tailwind + `cn()`).

## i18n (bn default, en)
- URL-based: `app/[lang]/` is the root layout (no `app/layout.tsx`). `proxy.ts` redirects un-prefixed paths → `/bn|/en` (cookie `NEXT_LOCALE` → Accept-Language → bn). `/api` is not localized.
- Strings: `lib/i18n/dictionaries/bn.ts` (source of truth, defines `Dictionary` type) + `en.ts` (must match). Server: `getDictionary(lang)`; pass the needed slice to client components as props (no client i18n lib).
- Links: always `href(lang, "/path")` from `lib/i18n/config.ts`. Pages: `const { lang } = await params; if (!hasLocale(lang)) notFound();`
- New UI text → add to BOTH dictionaries.

## Structure
- `app/[lang]/(public)/` public pages (`page.tsx` = home); `app/api/*/route.ts` Route Handlers
- `components/medicine/` SearchBar, Disclaimer, MedicineTable (filters/table/pagination/skeleton, server-only render)…; `components/layout/` SiteHeader/Footer
- Search: `server/services/search.service.ts` (`parseQuery` "napa 500"→text+strength; Bangla via `lib/search/bnTranslit.ts` + spelling variants k/c, j/g/z, ks/x, inherent "o"; Atlas `$search` index `medicine_search` (def in `models/Medicine.ts`, create with `npm run db:search-index`); regex fallback on error/0 hits; SearchLog on 0 hits). Shared client/server types in `lib/search/types.ts`. API: `/api/autocomplete?q=`, `/api/search?q=&page=`. Page `/[lang]/search` (noindex). Regression: `npm run test:search` (dev server must run; cases in `tests/search-cases.json`; add a case for every search fix).
- Medicine detail `/[lang]/medicine/[slug]`: `getMedicineDetail` (`server/services/medicineDetail.service.ts`, `"use cache"` + `cacheLife("hours")` + `cacheTag("medicines","medicine:<slug>")`) → header/price/packs, alternatives (same genericId+strength+formSlug, cheapest 15, savings only when same price basis), brand variants, generic sections (`components/medicine/MedicineDetailView.tsx`, HTML in `.med-html` styles in globals.css). `generateStaticParams` prerenders a few popular slugs; page awaits params + data outside Suspense so unknown slug = real 404.
- Interaction checker `/[lang]/interactions?m=slug1,slug2` (max 8): `checkInteractions` (`server/services/interaction.service.ts`) → per medicine pair: duplicate (same ingredient) > warning > caution > none. UI: `components/interactions/InteractionPicker.tsx` (client, URL state) + `InteractionResults.tsx` (server). API `GET /api/interactions?m=`.
- Conditions guide: `Condition` model, data edited directly in MongoDB (names, aliases, red flags, `formPattern`, `generics[]` with label evidence). Rule when editing: generics only OTC with ALL ingredients allowed + label evidence. `ALWAYS_EXCLUDED_FORMS` in `lib/conditions.ts`. Service `server/services/condition.service.ts` (`listConditions`/`getCondition` "use cache" tag `conditions`, `findConditions` whole-word alias match). Pages `/[lang]/conditions`, `/[lang]/condition/[slug]` (all prerendered); home chips (8 + native `<details>` "see more"); search page shows matching conditions. UI `components/conditions/ConditionViews.tsx`. 30 conditions, `reviewed:false` until clinician review.
- **Data source = MongoDB only.** All import/mining scripts were deleted (user decision); data is edited directly in the DB. After a DB edit, refresh cached pages: `POST /api/revalidate` header `x-revalidate-secret: $REVALIDATE_SECRET`, body `{"tags":["medicines","conditions","home"]}` (or `medicine:<slug>`, `condition:<slug>`). `revalidateTag(tag,"max")` = stale-while-revalidate: first request may still be old.
- Prescription scan (`docs/scan-feature.md`): `/[lang]/scan` → `components/scan/ScanFlow.tsx` (client: compress ≤1600px JPEG → `POST /api/scan` → review step, user must confirm/fix each match) → `/[lang]/scan/result?m=slugs` (noindex; price + cheapest same-basis alternative + `checkInteractions`). `server/services/scan.service.ts`: Gemini (`@google/genai`, model `GEMINI_MODEL` default `gemini-3.5-flash`, JSON schema, medicines only — no patient data/dosing) → match via `autocomplete()` + score (brand +3, strength +2, form +1; `sure` ≥5 & legible). Images NEVER stored/logged. Rate limit 10/h/IP (`lib/rateLimit.ts`, in-memory, counted after validation).
- Unbuilt features linked in header (`/account`) render `components/layout/ComingSoon.tsx` (200, noindex); replace when implementing.
- Home `/[lang]`: hero search → `StatsBar` → scan CTA → `SavingsShowcase` (most expensive vs cheapest per-unit brand of the same generic+strength+form) → condition chips → `PopularGrid` → `InteractionTeaser` → `HowItWorks` → features → `Faq` → disclaimer. Sections in `components/home/HomeSections.tsx`; data `getHomeData()` (`server/services/home.service.ts`, "use cache" tags `medicines`/`home`; `FEATURED` slug list there — verify slugs exist when editing).
- SEO (all public pages are server-rendered; check with Googlebot UA): every indexable page's `generateMetadata` returns `pageMeta(lang, "/path", {title, description})` from `lib/seo.ts` (canonical without query params, hreflang bn/en/x-default→bn, Open Graph + Twitter with `/[lang]/opengraph-image`). Layout sets only site defaults + `metadataBase` (never alternates). Personal/thin pages: `robots: noindex` (search, scan result, account). JSON-LD via `components/seo/JsonLd.tsx` (escapes `<`): home WebSite+SearchAction+Organization+FAQPage, medicine Drug+BreadcrumbList, condition MedicalWebPage+BreadcrumbList. `app/sitemap.ts` (`generateSitemaps`: `/sitemap/0.xml` static+conditions, `/sitemap/1..n.xml` medicines 10k each, with bn/en alternates; data `server/services/seo.service.ts`), `app/robots.ts` lists all sitemaps. New public page → add to `STATIC_PATHS` in sitemap.
- Pages: `/[lang]/medicines` (`view=all|brand`, `q`, `type`, `sort`, `page` GET params → `medicineListQuery`; build links with `listHref()` from `lib/medicineListUrl.ts`). Filters auto-apply (`components/medicine/MedicineFilters.tsx`, client, inside the page's Suspense: selects on change, search debounced 400ms, `router.replace`; no submit button). `view=all` → `listMedicines` table (one row per strength/form). `view=brand` → `listBrands` (`"use cache"` tag `medicines`; step 1 aggregate brand+manufacturer summaries & paginate, step 2 load variants only for that page) → `components/medicine/BrandList.tsx` (native `<details>` expands strengths/forms; single-variant brands link directly). 50/page.
- `models/` Mongoose models, all exported from `models/index.ts`
- `server/services/` all DB logic; `server/actions/` Server Actions; `server/validators/` Zod
- `store/` `medicineApi.ts` (RTK Query, baseUrl `/api`), `store.ts` (`makeStore`), `StoreProvider.tsx`
- `lib/db.ts` cached `connectDB()`; `lib/utils.ts` `cn`, `slugify`; `hooks/useDebounce.ts`
- `data/raw/*.csv` (git-ignored original dump, not used by code), `data/ANALYSIS.md` (historical analysis)
- `scripts/` (run via `tsx`): `search-index.ts` (`npm run db:search-index`, Atlas Search index def from `models/Medicine.ts`, no data writes), `test-search.ts` (`npm run test:search`)

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
- ALL numbers in UI use English digits, both languages (user decision) — never write Bangla digits (০-৯) in dictionaries, components, catalogs or docs; never `Intl.NumberFormat("bn-BD")`. Use `formatNumber(lang, n)` / `formatPrice(lang, n)` (bn "12 টাকা", en "৳12") from `lib/format.ts`. Only exception: `lib/search/bnTranslit.ts` converts Bangla digits typed by users (input, not display).
- Never `re.test()` with a `/g` regex in loops/filters (stateful `lastIndex` → skips matches).
- Dev HMR after adding a new export can SSR-fail once ("Element type is invalid… undefined", page shows `$RX` client fallback) → just reload.
- Mongoose calls `new Date()` internally → any uncached DB read in a page/component needs `await connection()` (from `next/server`) first, even after awaiting `searchParams`. Keep it in the page, not the service (services may be used under `"use cache"`).
- 404s: root layout is dynamic (`app/[lang]/layout.tsx`) → segment `notFound()`/`not-found.tsx` SSR-fails (`<html id="__next_error__">`, client reload loop). Use `app/global-not-found.tsx` (`experimental.globalNotFound`) for unmatched URLs, and `localizedNotFound(lang)` (`lib/i18n/notFound.ts`, redirects to `/<lang>/404`) inside pages. Never add `not-found.tsx` or a `[...rest]` catch-all under `[lang]`.
- Real 404 for dynamic `[slug]`: `generateStaticParams` + `export const instant = false` + await params/`"use cache"` data at page top level (not in Suspense, else soft 200).
- Pages reading `searchParams`/DB: put that part in an async child inside `<Suspense>` (pattern: `app/[lang]/(public)/medicines/page.tsx`). Services import `"server-only"`.
- eslint `react-hooks/refs`: no `ref.current` in render → `useState(makeStore)` in StoreProvider.
- Dev "instant" validation (`Could not validate instant because an error prevented the target segment from rendering`): wrap interactive client components in `<Suspense>` with a static look-alike fallback (pattern: `app/[lang]/(public)/scan/page.tsx` → `ScanFlow`); errors/browser-bailouts under a Suspense are allowed. Prefer `<Link>` over `useRouter()` in client components. Debug via dev MCP: `POST /_next/mcp` tools `get_errors`/`get_logs` (cause isn't exposed; validation errors show only in the browser overlay).
- RTK Query hooks (`useXQuery`) read `Date.now()` in render → any client component using them must render inside `<Suspense>` with a static fallback (pattern: `components/medicine/SearchBar.tsx`).
- Stale dev cache (old HTML after moves/renames): stop dev server, delete `.next`, restart, Ctrl+Shift+R. Don't run `next build` while dev is running.
- Redux `combineReducers` calls `Math.random()` → build `rootReducer` at module level in `store/store.ts` (never inside `makeStore`). Add new slices there.
- Scripts needing DB: `tsx --env-file=.env` (Next doesn't load `.env` outside the app). Mongoose 9: use `await doc.validate()`, not deprecated `validateSync()`. Never write a script that bulk-writes data without the user asking (data is managed in the DB by the user).
- Shell: PowerShell 5.1 primary; bash heredocs unreliable here, so use the Write tool for files.
- User usually runs `npm run dev` on :3000 already; don't start a second server, just hit `http://localhost:3000`.

## Data model (key points)
- Origin: medex.com.bd CSV dump (see `data/ANALYSIS.md`); now maintained directly in MongoDB. Core models keep `sourceId` (original CSV id).
- Generic: name, slug, aliases[], drugClass, pregnancyCategory?, `sections.{indication,dosage,interaction,contraindications,sideEffects,pregnancyLactation,precautions,…}` (HTML rendered raw — only p/br/ul/ol/li/strong/em/sub/sup/table tags when editing), monographUrl, brandCount. Warnings live on Generic, not brand.
- Medicine: brand, slug (own `slugify(brand strength form)`, `-<sourceId>` on clash), aliases[], type allopathic|herbal, genericId+genericName, manufacturerId+manufacturerName (denormalized for `$search`), strength?, dosageForm (exact string) + formSlug, unitPrice (per unit else cheapest pack; null = unavailable), priceLabel (null = per unit, else that pack's label "5 gm tube"), packs[{label,price,qty?,qtyPrice?}], priceText. Index `{genericId,strength,formSlug,unitPrice}`.
- No DosageForm/DrugClass/Indication collections; indication data never used for browsing (no symptom→medicine).
- Interaction: ingredient-level (`lib/ingredients.ts` `ingredientsOf`/`matchTerms`/`pairKey`), unique `pairKey` "a|b" sorted, `severity` warning|caution (warning only from explicit label wording: contraindicated/avoid/should not…), `evidence[]` = verbatim label sentences (+`via` when label named a drug class), `source` required. Originally mined from label text (negated sentences, self-class and same-mineral pairs skipped); ~7.5k pairs, now edited in DB. Missing pair = "তথ্য নেই", never "safe".
- Others: Manufacturer, User(role), Prescription, Report, SearchLog. Models are provisional until the CSV analysis.

## Env (`.env`)
`MONGODB_URI`, `MONGODB_DNS_SERVERS`, `REVALIDATE_SECRET` (for `POST /api/revalidate`), `SITE_URL` (public origin for canonical/sitemap/OG; default `http://localhost:3000` — MUST be set in production), `GEMINI_API_KEY`, optional `GEMINI_MODEL`. Planned: `AUTH_*`, `UPSTASH_*`. (Cloudinary dropped: scan images aren't stored.)

## Status
- [x] Project setup, deps, folder structure
- [x] Mongoose connection + 8 models + `/api/health`
- [x] Homepage UI (search bar w/ autocomplete UI, scan CTA, popular list static, features, disclaimer)
- [x] bn/en i18n (URL-based, header toggle); homepage, header, footer translated
- [x] CSV → `data/ANALYSIS.md` → finalize Generic/Medicine/Manufacturer models
- [x] Data imported to Atlas (240 mfr, 1,711 generics, 21,714 medicines); import scripts since removed — DB is the source of truth
- [x] `/medicines` browse table (regex filter for now)
- [x] Atlas Search index + `/api/search`, `/api/autocomplete`, `/search` page, Bangla search (22/22 cases)
- [ ] Search ranking among same-brand variants (needs `popularity`; currently tie → brand A–Z), rate limit (Upstash)
- [x] `/medicine/[slug]` (cached, SEO metadata, alternatives + savings, warnings, real 404)
- [ ] `/generic/[slug]` (generic links currently go to `/search?q=<generic>`)
- [x] Warnings (medicine page) + `/interactions` checker (label-mined data)
- [x] Common conditions guide (30 conditions, OTC-only, label evidence) — [ ] clinician review of red flags + allow-lists before launch
- [ ] Better interaction source (e.g. DDInter/DrugBank, license check) — current data misses pairs whose labels don't mention each other (e.g. warfarin + ciprofloxacin)
- [ ] Auth.js, account, save/report (Server Actions)
- [x] `/scan` (Gemini → match → user review → alternatives + interactions; no image storage)
- [ ] Before launch: Gemini paid tier (free tier may use data for training — health data), Upstash rate limit, test with real handwritten prescriptions
- [ ] Admin panel, rate limits, Lighthouse, deploy
