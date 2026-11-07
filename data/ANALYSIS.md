# CSV Analysis (source: medex.com.bd dump, 6 files in `data/raw/`)

Re-check: `npm run db:import:dry` (joins, price parse, validation)

| File | Rows | Use |
|---|---|---|
| medicine.csv | 21,714 brands (351 herbal) | → `medicines` |
| generic.csv | 1,711 | → `generics` (15 HTML monograph sections) |
| manufacturer.csv | 240 | → `manufacturers` |
| dosage_form.csv | 113 | not imported; form kept as string on Medicine (100% join) |
| drug_class.csv | 453 | not imported; name kept on Generic (100% join) |
| indication.csv | 2,043 | **not imported**: indication→medicine browsing = symptom→medicine (out of scope) |

## Joins (by name, case-insensitive)
- medicine.generic → generic name: 21,712/21,714 (2 miss → import with `genericId: null`, log)
- medicine.manufacturer → manufacturer: 100%; medicine.dosage form → dosage form: 100%
- Joins are by **name** (CSV has no FK ids) → importer builds name→_id maps.

## Medicine quirks
- Source slugs ugly (`a-coldsyrup4-mg5-ml`) + 111 duplicates → own slug `slugify(brand strength form)`, on collision append `-<brandId>`.
- Duplicate slugs = same brand/generic/strength, different packs → separate docs (distinct brand ids).
- strength empty 3.9% (mostly herbal syrups) → null.
- `package container` price formats:
  - `Unit Price: ৳ 5.98,(100's pack: ৳ 598.00),` (13.5k) → unitPrice 5.98, pack qty 100 / 598
  - `100 ml bottle: ৳ 40.12` (+ repeated for multiple sizes) → packs[] each {label, price}
  - `Price Unavailable` (78) → unitPrice null
  - `Package Size` column duplicates pack info → ignored.
- unitPrice rule: per-unit price if `Unit Price`, else cheapest pack price. Alternatives compare only same generic+strength+dosageForm.
- 112 dosage forms used; keep exact string (e.g. "Tablet (Enteric Coated)" ≠ "Tablet" for alternatives) + `formSlug`.

## Generic quirks
- Sections are HTML (`<div class="ac-body">…`). Long ones contain a collapsed copy (`min-str`) + full copy (`full-str`) → keep only `full-str`, strip wrapper, sanitize to allowlist (p, br, ul, ol, li, strong, em, b, i, sub, sup, table tags) at import.
- `indication` single-name column is unreliable (Aspirin → "Yellow fever infection") → dropped; use indication section.
- Pregnancy category regex-parseable for only 324/1,711 → `pregnancyCategory` optional; full text in section.
- `drug class` single string (49 contain commas, still one class).
- `monograph link` 70% → stored as `monographUrl`.
- `interaction description` is prose only → no structured pairs; `interactions` collection stays empty until a pair source is found.

## Decisions
- Collections: `generics`, `medicines`, `manufacturers` (+ existing app collections). No DosageForm/DrugClass/Indication collections (YAGNI).
- `sourceId` = CSV id (string) on all three → idempotent upsert re-imports.
- Data attribution: medex.com.bd; show "source" on generic page. Licensing to be confirmed by owner before public launch.
