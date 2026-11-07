# MedicineMate — AI Context

> Read this first. Keep it short and current: after any task that changes structure, conventions, models, APIs, env vars or status, update the relevant section (and tick Status). No long prose; facts only.

## What
Bangladesh medicine helper web app: search any medicine (brand/generic/Bangla/typo), see price, cheaper alternatives (same generic+strength+form), warnings, drug interactions, prescription scan (Gemini Vision OCR). Info only, never medical advice; every medicine/alt/interaction/scan page shows `<Disclaimer />`. No symptom→medicine feature.

## Stack
Next.js 16.4 (App Router, Turbopack, `cacheComponents` ON), React 19, TS strict, Tailwind 4 (tokens in `app/globals.css`), lucide-react, RTK Query, Zod, Mongoose → MongoDB Atlas (db `medicinecheck`). Planned: Atlas Search, Auth.js, Cloudinary, Gemini, Upstash Redis, Vercel. No Shadcn yet (plain Tailwind + `cn()`).

## Structure
- `app/(public)/` public pages (`page.tsx` = home); `app/api/*/route.ts` Route Handlers
- `components/medicine/` SearchBar, Disclaimer…; `components/layout/` SiteHeader/Footer
- `models/` Mongoose models, all exported from `models/index.ts`
- `server/services/` all DB logic; `server/actions/` Server Actions; `server/validators/` Zod
- `store/` `medicineApi.ts` (RTK Query, baseUrl `/api`), `store.ts` (`makeStore`), `StoreProvider.tsx`
- `lib/db.ts` cached `connectDB()`; `lib/utils.ts` `cn`, `slugify`; `hooks/useDebounce.ts`
- Planned: `scripts/import/` (CSV→Mongo), `data/raw/` (git-ignored CSVs), `tests/search-cases.json`

## Rules
- Route Handlers / Server Actions: validate with Zod → call `server/services/` → return `{ data, error }`. No direct DB queries in routes.
- Read-heavy data (search, autocomplete, medicine) = Route Handler; form mutations (save, report, admin edit) = Server Action.
- Server Components call services directly, never RTK Query.
- Every route calls `await connectDB()`; use `.lean()` + `select`.
- Secrets server-only (never `NEXT_PUBLIC_`). Strip `$`-prefixed keys from queries.
- No `any` except raw CSV rows. Ask the user when something is unclear; don't guess.

## Gotchas (already hit)
- `cacheComponents` ON: no `export const dynamic/revalidate` in routes; no `new Date()`/`Math.random()` during render of prerendered pages (use `"use cache"`, client component, or `await connection()`).
- Windows + Node 24: Atlas SRV lookup fails (`querySrv ECONNREFUSED`). Fixed via `.env` `MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1` (read in `lib/db.ts`).
- eslint `react-hooks/refs`: no `ref.current` in render → `useState(makeStore)` in StoreProvider.
- Shell: PowerShell 5.1 primary; bash heredocs unreliable here, so use the Write tool for files.
- User usually runs `npm run dev` on :3000 already; don't start a second server, just hit `http://localhost:3000`.

## Data model (key points)
- Generic (warnings, indications, sideEffects, pregnancyCategory) ← Medicine `genericId`. Warnings live on Generic, not brand.
- Medicine: brand, slug(unique), aliases[], genericName/manufacturerName (denormalized for `$search`), strength "500 mg", form enum, unitPrice, priceVerifiedAt, popularity, sourceId(unique sparse). Index `{genericId,strength,form,unitPrice}`.
- Interaction: pair stored sorted (pre-validate), unique `{genericA,genericB}`, `source` required; missing pair = "তথ্য নেই", never "safe".
- Others: Manufacturer, User(role), Prescription, Report, SearchLog. Models are provisional until the CSV analysis.

## Env (`.env`)
`MONGODB_URI`, `MONGODB_DNS_SERVERS`. Planned: `GEMINI_API_KEY`, `CLOUDINARY_*`, `AUTH_*`, `UPSTASH_*`.

## Status
- [x] Project setup, deps, folder structure
- [x] Mongoose connection + 8 models + `/api/health`
- [x] Homepage UI (search bar w/ autocomplete UI, scan CTA, popular list static, features, disclaimer)
- [ ] Kaggle CSV → `data/ANALYSIS.md` → finalize models → `scripts/import` (`db:import`, `db:import:dry`, `db:verify`)
- [ ] Atlas Search index + `/api/search`, `/api/autocomplete` (query parse "napa 500"; SearchLog on zero results)
- [ ] `/medicine/[slug]`, `/generic/[slug]` (ISR, SEO metadata, alternatives)
- [ ] Warnings + `/interactions`
- [ ] Auth.js, account, save/report (Server Actions)
- [ ] `/scan` (Cloudinary signed upload → Gemini → match → alternatives + interactions)
- [ ] Admin panel, bn/en i18n, rate limits, Lighthouse, deploy
