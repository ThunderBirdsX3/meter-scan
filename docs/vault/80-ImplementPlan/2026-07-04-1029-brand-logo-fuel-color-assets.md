---
tags: [type/plan]
date: 2026-07-04 10:29
title: Normalize fuel_type to canonical flag + brand_fuel join; wire real logos + colors
status: done
completed_at: 2026-07-04 11:54
subagent_target: mobile
related_docs:
  - "[[REF-Architecture]] §3 (brand/fuel_type DDL — SCHEMA CHANGE), §7 (Seed Dataset)"
  - "[[SRS-fuel-log]] FR-005 (brand/fuel type read-only + logo/color), FR-011 (seed), FR-001 (brand/fuel optional independent), FR-008 (overview grouping)"
  - "[[IMPLEMENTATION-STATUS]] Next steps: 'Real fuel colors' + 'Brand logo assets'"
  - "[[2026-07-02-2140-sqlite-persistence-seed]] (Risks: fuel color reference, logo placeholder)"
  - "[[2026-07-03-2208-vehicle-fuel-autofill]] (vehicle.default_fuel_type_id semantics)"
estimate_hours: 7
risk_level: high
---

# Normalize fuel_type to canonical flag + brand_fuel join; wire real logos + colors

> **Revised 2026-07-04**: scope grew from "drop assets into seed" to a **schema refactor**. User chose a *normalized* model: `fuel_type` becomes a **brand-agnostic canonical catalog** (flag codes G91/G95/G95+/…); a new **`brand_fuel` join** carries the per-brand color (+ optional marketing name). This kills the marketing-name/hand-map ambiguity — each (brand × flag) maps to exactly one color from the reference table.

## Vault Context Read
- `REF-Architecture.md` §2 (Seed→Db bootstrap), §3 (current `brand`/`fuel_type` DDL — `fuel_type` currently per-brand w/ `brand_id` FK, `grade`, `color`), §7 (Seed Dataset, logo path convention, color TODO)
- `SRS-fuel-log` FR-005 (read-only master data, no user CRUD), FR-011 (idempotent seed, `seed_config_version`), FR-001 (brand & fuel independent-optional on entry), FR-008 (overview segments trip/month/vehicle)
- `IMPLEMENTATION-STATUS.md` — FR-005/FR-011 built; open "Next steps": real colors + logo assets
- Code read (blast radius): `db.service.ts` (DDL, `user_version` v0→v1 migration, `getFuelTypes`, `getFuelTypeById`, `seedInsertFuelType`, row mappers), `seed-data.ts` (`SEED_BRANDS`, `PLACEHOLDER_FUEL_COLOR`, `SEED_CONFIG_VERSION`), `seed.service.ts` (guard+txn), `fuel-entry.model.ts` (`FuelType.brandId/grade/color`), `add.page.ts` (picker: `getBrands()`+`getFuelTypes()`, `sortFuelTypesByBrand`, `fuelOptionLabel`, vehicle-default autofill), `master-data.page.ts` (brand-group by `ft.brandId`), `fuel-data.service.ts` (facade)
- Assets read: `fuel-brand-icons/ico/*.ico` (10 brands), `ziIesIbY` (PNG multi-size zip), `fuel-colors-by-brand.md` (per-brand fuel-type hex, 8 brands)

## Task
Refactor the fuel-type data model from per-brand rows to a **canonical flag catalog + `brand_fuel` join**. Seed the extended flag set, map real per-brand colors from `fuel-colors-by-brand.md` onto the join, copy brand logo `.ico` into `assets/brand-logos/`, fix the runtime logo-path bug (`src/` prefix), and update every consumer (DbService, models, Add picker, master-data page, facade, specs). Master data stays read-only (FR-005). Dev reset: wipe + reseed on version bump (pre-release, no real installs).

## FR Coverage
- FR-005 — brand/fuel_type read-only master data + logo + color (schema-refactored, still read-only)
- FR-011 — seed bootstrap (catalog + join, `SEED_CONFIG_VERSION` bump, wipe+reseed)
- FR-001 — brand & fuel remain independently optional on an entry (both FKs nullable, unchanged)
- FR-008 — overview grouping: canonical `code` now enables cross-brand fuel grouping (enhancement noted, not required by this plan)
- FR orphan/underspecified: none new. Behavior contract (read-only, optional) preserved.

## Decisions (clarify 2026-07-04)
1. **Model = normalized catalog + join.** `fuel_type` = brand-agnostic catalog (`code`, `label`); new `brand_fuel(brand_id, fuel_type_id, color, marketing_name?)` join. `fuel_entry.fuel_type_id` and `vehicle.default_fuel_type_id` now reference the **canonical** `fuel_type.id` (a car burns G95 regardless of station — improves autofill semantics).
2. **Flag set = extended** (from real color table): `G91, G95, G95+, E20, E85, B95, DIESEL, DIESEL+, B20, NGV` (+ `LPG` in catalog for completeness). `B95` = เบนซิน 95 (non-ethanol ULG), distinct from `G95` gasohol.
3. **Brand roster** = 8 brands in the color table: PTT, Bangchak, Shell, Caltex, PT, IRPC, Susco, PURE. **Esso/Mobil + Sinopec dropped** (not in color table). **`อื่นๆ (Other)` brand dropped** too — no longer needed: canonical fuel is pickable with brand left null (FR-001), so "unlisted station" = null brand + a catalog fuel.
4. **Logos** = `.ico` → `assets/brand-logos/<slug>.ico` (drop broken `src/` prefix).
5. **Reseed** = wipe `brand`/`fuel_type`/`brand_fuel` then reseed on version change (dev reset; pre-release).

## New Schema (REF-Architecture §3 change — docs pass)
```sql
CREATE TABLE fuel_type (              -- brand-agnostic canonical catalog
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,          -- 'G91','G95','G95+','E20','E85','B95','DIESEL','DIESEL+','B20','NGV','LPG'
  label TEXT NOT NULL,               -- Thai display, e.g. 'แก๊สโซฮอล์ 95'
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE brand_fuel (             -- which fuels a brand sells + per-brand color
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id INTEGER NOT NULL REFERENCES brand(id) ON DELETE CASCADE,
  fuel_type_id INTEGER NOT NULL REFERENCES fuel_type(id) ON DELETE CASCADE,
  color TEXT,                         -- hex per (brand,fuel) from fuel-colors-by-brand.md
  marketing_name TEXT,                -- e.g. 'V-Power Diesel' (optional display override)
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(brand_id, fuel_type_id)
);
-- brand table unchanged (logo_asset now points to .ico under assets/)
-- fuel_entry.fuel_type_id + vehicle.default_fuel_type_id keep the column; now → canonical fuel_type.id
```
Migration: `user_version` v1→v2 — drop old per-brand `fuel_type`, create catalog `fuel_type` + `brand_fuel` (toggle `PRAGMA foreign_keys` around the drop). Wipe nulls existing `fuel_entry`/`vehicle` fuel refs (accepted, R2).

## Seed map: brand × flag → color (source: fuel-colors-by-brand.md)
> `mkt` = marketing_name override. Catalog labels: G91=แก๊สโซฮอล์ 91, G95=แก๊สโซฮอล์ 95, G95+=แก๊สโซฮอล์ 95 พรีเมียม, E20=แก๊สโซฮอล์ E20, E85=แก๊สโซฮอล์ E85, B95=เบนซิน 95, DIESEL=ดีเซล, DIESEL+=ดีเซลพรีเมียม, B20=ดีเซล B20, NGV=NGV, LPG=LPG.

- **PTT** — G95 #C44F0D · G91 #00853F · E20 #98C93C · E85 #A83292 · G95+ #FA6B14 · B95 #FFC10E · DIESEL #0072BB · DIESEL+ #012872 · NGV #00C0F2
- **Bangchak** — G95 #0075B8(mkt ไฮเอโว 95S) · G91 #009C8F(mkt ไฮเอโว 91S) · E20 #F2572B · E85 #CB2028 · G95+ #AA872C(mkt Hi Premium 97) · DIESEL #2B296A(mkt ไฮดีเซล) · DIESEL+ #603D97(mkt ไฮพรีเมียมดีเซล)
- **Shell** — G95 #EC6C2C(mkt FuelSave 95) · G91 #A6C846(mkt FuelSave 91) · E20 #00AFB2 · G95+ #EC6C2C(mkt V-Power 95) · DIESEL #62696F(mkt FuelSave Diesel) · DIESEL+ #A7A8AC(mkt V-Power Diesel)
- **Caltex** — G95 #F26F21 · G91 #00A74F · E20 #98C93C · B95 #FFC10E · DIESEL #0072BB · DIESEL+ #012872
- **PT** — G95 #EC6C2C · G91 #A6C846 · E20 #00AFB2 · B95 #FECD22 · DIESEL #62696F · DIESEL+ #0CAA4D
- **IRPC** — G95 #B2061C · G91 #FF710A · DIESEL #0B4F90
- **Susco** — G95 #B2061C · G91 #FF710A · E20 #1F6600 · B95 #08B0EF · DIESEL #0B4F90 · B20 #00376B
- **PURE** — G95 #B2061C · G91 #FF710A · E20 #1F6600 · DIESEL #0B4F90 · B20 #00376B

> LPG appears in no brand offering here → catalog-only (selectable with null brand). No guessed colors — every hex above is from the reference table.

## Goals
- [x] New schema: catalog `fuel_type` + `brand_fuel` join; v1→v2 migration
- [x] `fuel-entry.model.ts`: reshape `FuelType` (`code`/`label`/`sortOrder`), add `BrandFuel` (+ a resolved `BrandFuelOption` view for pickers)
- [x] Seed: 11-code catalog + 8 brands + brand_fuel with real colors/mkt names; logos `.ico`; `SEED_CONFIG_VERSION='2'`; drop Esso/Sinopec/Other
- [x] `db.service.ts`: DDL + migration + `getFuelTypes()`(catalog) + `getBrandFuels(brandId)` + `getFuelColor(brandId,fuelTypeId)` + rewritten seed inserts + wipe
- [x] Add picker + master-data page updated to the join model; color dot via `brand_fuel.color`
- [x] Copy 8 `.ico` → `src/assets/brand-logos/`; fix logo path
- [x] Specs updated; `npm run build` EXIT=0; karma green (64/64)
- [x] REF-Architecture §3/§7 + IMPLEMENTATION-STATUS updated (docs pass)

## Non-goals
- No new cross-brand fuel-comparison stats screen (FR-008 enhancement enabled by `code`, but not built here)
- No user-facing brand/fuel CRUD (FR-005 unchanged)
- No diff-based partial-append migration (wipe+reseed)
- No PNG bundling (`.ico` chosen; PNG set is R3 fallback)
- Keep Esso/Sinopec assets out of seed

## Doc Gaps Found
- **Logo path bug**: seed uses `src/assets/brand-logos/<slug>.png` — Angular serves `/assets/...` at runtime, so `src/` prefix 404s → always placeholder. Fix to `assets/brand-logos/<slug>.ico`.
- **REF-Architecture §3** `fuel_type` DDL changes shape (per-brand → catalog) + new `brand_fuel` table — update.
- **§7** color TODO + roster (−Esso −Other +IRPC +PURE) + marketing-name concept — update.
- **`vehicle.default_fuel_type_id` semantics** shift to canonical fuel — note in §3 + autofill plan cross-ref.

## Affected Files
- `src/assets/brand-logos/{ptt,bangchak,shell,caltex,pt,irpc,susco,pure}.ico` — **new** (copy from assets)
- `src/app/models/fuel-entry.model.ts` — `FuelType` reshape; new `BrandFuel` + `BrandFuelOption`
- `src/app/services/db.service.ts` — DDL, v1→v2 migration, catalog/join queries, seed inserts, wipe, row mappers
- `src/app/services/seed-data.ts` — catalog + brand + brand_fuel restructure, colors, `.ico` paths, version bump
- `src/app/services/seed.service.ts` — seed order (catalog→brands→brand_fuel), wipe-on-mismatch
- `src/app/services/fuel-data.service.ts` — facade: expose `getBrandFuels`/`getFuelColor`
- `src/app/add/add.page.ts` + `.html` — picker to join model; color dot via brand_fuel; autofill canonical default
- `src/app/settings/master-data/master-data.page.ts` + `.html` — catalog list + per-brand color grid from brand_fuel
- specs: `db.service.spec.ts`, `seed.service.spec.ts`, `add.page.spec.ts`, `master-data.page.spec.ts`
- `docs/vault/70-Reference/REF-Architecture.md` §3/§7 + `docs/vault/00-Index/IMPLEMENTATION-STATUS.md` — docs subagent

## Implementation Steps
1. Copy the 8 roster `.ico` → `src/assets/brand-logos/` (slugs ptt/bangchak/shell/caltex/pt/irpc/susco/pure).
2. `fuel-entry.model.ts`: `FuelType = { id; code; label; sortOrder?; deletedAt? }` (remove brandId/grade/color/name→label). Add `BrandFuel = { id; brandId; fuelTypeId; color?; marketingName?; deletedAt? }` and `BrandFuelOption = { brandId; fuelTypeId; code; label; color?; marketingName? }` (join view for pickers).
3. `db.service.ts` DDL + migration v1→v2: within a migration txn (guard `PRAGMA foreign_keys`), `DROP TABLE fuel_type`, create catalog `fuel_type` + `brand_fuel` per new schema. Bump base-version constant. Add row mappers for both.
4. `db.service.ts` queries: `getFuelTypes()` → catalog (`deleted_at IS NULL ORDER BY sort_order`); `getFuelTypeById(id)`; `getBrandFuels(brandId)` → JOIN returning `BrandFuelOption[]`; `getFuelColor(brandId, fuelTypeId)` → hex|null; `getAllBrandFuels()` (master-data). Rewrite seed inserts: `seedInsertFuelType(code,label,sort)`, `seedInsertBrand(name,logoAsset)`, `seedInsertBrandFuel(brandId,fuelTypeId,color,marketingName)`. Add `clearMasterDataForReseed()` (`DELETE brand_fuel; DELETE fuel_type; DELETE brand;`).
5. `seed-data.ts`: `CANONICAL_FUEL_TYPES` (11 codes + labels + sort), `SEED_BRANDS` (name, `assets/brand-logos/<slug>.ico`, `offers:[{code,color,marketingName?}]`) per the seed map above; `SEED_CONFIG_VERSION='2'`; rewrite header comment (colors real, model normalized, path fixed).
6. `seed.service.ts`: on version mismatch with a prior row → `clearMasterDataForReseed()` first; then insert catalog, then brands, then resolve each offer's `fuel_type_id` by code and insert `brand_fuel`. All in one txn + rollback.
7. `fuel-data.service.ts`: pass-through `getBrandFuels`/`getFuelColor`/`getAllBrandFuels`.
8. `add.page.ts`/`.html`: on brand select → `getBrandFuels(brandId)` populates the fuel picker (label = `marketingName || label`); if no brand, offer full catalog `getFuelTypes()`. Color dot = selected offering's `color` (or `getFuelColor`). Vehicle-default autofill sets canonical `fuelTypeId` (unchanged logic, new target). Keep both FKs optional (FR-001).
9. `master-data.page.ts`/`.html`: render brands with logo; under each, its `brand_fuel` offerings (label/code + color swatch); plus the canonical catalog list. Fallbacks unchanged (`onerror`/`*ngIf`).
10. Update all four specs (catalog counts, brand_fuel colors, wipe-on-bump, picker filter-by-brand, no duplicate on reseed). `npm run build` (EXIT=0) + `npx ng test --watch=false` green; assert `www/assets/brand-logos/*.ico` present.
11. `docs` subagent: rewrite REF-Architecture §3 (new DDL) + §7 (colors/roster/mkt names/path), sync IMPLEMENTATION-STATUS (close both TODOs; note schema v2 + model change + autofill semantics).

## Design System Compliance
- [x] Brand hex = data-layer seed content on `brand_fuel.color` (brand identity ≠ DS token) — documented exception, same as plan 2026-07-02-2140. No DS token added.
- [x] Logo/color stay **supplemental** (code/label text always shown) — WCAG AA unaffected.
- [x] `.ico` in `<img>` — implemented (reuses avatar idiom). Device WKWebView render check (R3) deferred to `/ow-test` manual UAT.

## Design Additions
- `BrandFuelOption` picker view-model (data shape, not a UI token). No new DS component (reuse avatar + color-dot idiom).

## Test Plan
- [x] Unit `db.service.spec`: v1→v2 migration builds catalog+join; `getBrandFuels(PTT)` returns 9 offers with colors; `getFuelColor(PTT,DIESEL)`==#0072BB
- [x] Unit `seed.service.spec`: 11 catalog codes, 8 brands, brand_fuel counts, sample colors, Esso/Sinopec/Other absent; reseed-on-bump leaves no duplicate rows
- [x] Unit `add.page.spec`: select brand → fuel list filtered to that brand's offers; no-brand → full catalog; color dot resolves
- [x] Build EXIT=0; `www/assets/brand-logos/*.ico` present (8 files)
- ⏭️ Manual (device/sim) — **DEFERRED to `/ow-test` manual UAT** (not run at implement time): Add form shows real logos + real color dots; master-data grid; `.ico` renders in avatar (plan R3)

## Success Criteria
- [x] `PRAGMA user_version==2`; `fuel_type` has `code`/`label` (no `brand_id`); `brand_fuel` exists with colors — `DB_VERSION=2` + db.service.spec migration tests green
- [x] `seed-data.ts`: zero `PLACEHOLDER_FUEL_COLOR`; no `src/` prefix in `logoAsset`; `SEED_CONFIG_VERSION==='2'` — grep 0/0, `SEED_CONFIG_VERSION='2'` (line 149)
- [x] Fresh seed → 11 catalog codes, 8 brands, brand_fuel colors == seed map; Esso/Sinopec/Other absent — seed.service.spec green
- [x] Existing v1 DB → bump wipes+reseeds, no duplicate brand/fuel rows (test-verified) — db.service.spec + seed.service.spec reseed tests green
- [x] Add picker filters fuel by selected brand; color dot from brand_fuel; brand still optional (FR-001) — add.page.spec green
- [x] `npm run build` EXIT=0; karma suite green — 64/64 SUCCESS (orchestrator-verified: build-output.txt / karma-output.txt)

## Verification
- map each Success Criteria to real output (migration test, `getBrandFuels` assertion, `grep PLACEHOLDER_FUEL_COLOR`, `ls www/assets/brand-logos`, build/karma logs) at `/ow-implement` / `/ow-test`.

## Risks
- **R1 — schema refactor blast radius**: touches db/model/seed/add/master-data/facade + specs. Mitigation: master data read-only + FKs stay nullable/optional; do it as one coherent change; specs gate each consumer. `high` risk_level.
- **R2 — wipe nulls `fuel_entry`/`vehicle` fuel FKs** (drop+wipe fuel_type). Accepted: pre-release, no real data. If real data ever exists → migrate ids by code-mapping instead of wipe.
- **R3 — `.ico` in WKWebView** at avatar size unverified. Fallback: PNG set in `ziIesIbY` (128px), one-line path swap.
- **R4 — flag mapping judgement**: G95 vs G95+ (premium) and DIESEL vs DIESEL+ resolved by product tier; `B95`(เบนซิน95) kept distinct from `G95`. Cosmetic if mis-tiered. Every color is table-sourced (no guessing).
- **R5 — `vehicle.default_fuel_type_id` semantic shift** (per-brand → canonical). Improves autofill (brand-independent) but any existing vehicle defaults get nulled by wipe — pre-release, acceptable; cross-ref autofill plan in docs pass.

## Approval
- [x] Approved (set status: approved before /ow-implement)

## Implementation Result
- **Status:** done (2026-07-04 11:54) · Subagents: `docs` (vault §3/§7 + IMPL-STATUS), `mobile` (code + specs) · normal mode (no worktree)
- **Files changed — production (uncommitted, main tree):**
  - `src/assets/brand-logos/{ptt,bangchak,shell,caltex,pt,irpc,susco,pure}.ico` (new, 8)
  - `src/app/models/fuel-entry.model.ts` (FuelType reshape + BrandFuel/BrandFuelOption)
  - `src/app/services/db.service.ts` (DB_VERSION=2, MIGRATION_V1_TO_V2, catalog/join queries, seed inserts, clearMasterDataForReseed, row mappers)
  - `src/app/services/seed-data.ts` (CANONICAL_FUEL_TYPES ×11, SEED_BRANDS ×8 + real colors/mkt, .ico paths, SEED_CONFIG_VERSION='2')
  - `src/app/services/seed.service.ts` (wipe-on-mismatch → catalog→brands→brand_fuel, one txn)
  - `src/app/services/fuel-data.service.ts` (getBrandFuels/getAllBrandFuels/getFuelColor pass-through)
  - `src/app/add/add.page.{ts,html}` (brand→onBrandChange picker, color dot, canonical autofill)
  - `src/app/settings/master-data/master-data.page.{ts,html}` (join grid + catalog section)
  - fallout (model reshape blast radius): `src/app/settings/vehicles/vehicles.page.{ts,html}`, `src/app/history/entry-detail/entry-detail.page.ts` (`.name`→`.label`)
- **Files changed — test:** `db.service.spec.ts`, `seed.service.spec.ts`, `add.page.spec.ts`, `entry-detail.page.spec.ts`; new: `master-data.page.spec.ts`, `vehicles.page.spec.ts`
- **Tests added:** see BUILD-INFO.md Test Coverage table (6 spec files, 2 new). Coverage audit PROD 18 / TEST 5 → pass.
- **Success criteria → evidence:** all 6 met (see Success Criteria above + EVIDENCE.md manifest). Manual device UAT (R3) deferred to `/ow-test`.
- **Evidence:** `test-artifacts/2026-07-04/plan-2026-07-04-1029-brand-logo-fuel-color-assets/EVIDENCE.md` (+ BUILD-INFO.md, build-output.txt, karma-output.txt) — gitignored
- **Docs:** REF-Architecture §3 (new DDL) + §7 (colors/roster/mkt/path) + IMPLEMENTATION-STATUS (both TODOs closed, schema-v2 note) — updated by docs subagent
- **Not done / next:** `/ow-test` (device/sim manual UAT — R3 `.ico` WKWebView render, real logos + color dots) → then `/ow-git --plan` to commit
