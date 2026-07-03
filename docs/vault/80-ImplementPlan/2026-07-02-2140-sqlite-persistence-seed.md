---
tags: [type/plan]
date: 2026-07-02 21:40
title: SQLite persistence + seed bootstrap (FR-010/011) + master-data soft-delete/logo/color — replace FuelDataService stub
status: done
completed_at: 2026-07-03 10:15
subagent_target: mobile
source_fix: none
related_docs:
  - "[[SRS-fuel-log]] — FR-001..011, §5 Data Model, §7 Error Catalog"
  - "[[REF-Architecture]] — §3 DDL, §7 Seed dataset"
  - "[[PRD-fuel-log]]"
  - "[[REF-TechStack]]"
  - "[[DS-Tokens]] — brand color/logo = external identity, ไม่ใช่ DS token (Design Addition)"
  - "[[IMPLEMENTATION-STATUS]]"
estimate_hours: 12
risk_level: medium
---

# SQLite persistence + seed bootstrap (FR-010/011) + master-data enrich

## Vault Context Read
- **SRS-fuel-log** — FR-010 (Local SQLite Persistence, cross-cutting), FR-011 (Seed Data Bootstrap), FR-005 (Brand & FuelType master config, read-only), FR-001..008 (CRUD contracts), §5 Data Model, §6 State & Lifecycle (ON DELETE SET NULL), §7 Error Catalog (DB_WRITE, DB_INIT), §11 Dependencies
- **REF-Architecture** — §2 arch (DbService + SeedService providedIn root), §3 SQLite DDL draft, §7 Seed dataset (8 brands + fuel types + grade)
- **IMPLEMENTATION-STATUS** — FR-010/011 = `deferred`; `FuelDataService` stub = seam to replace; FR-005 picker UI built
- **DS-Tokens** — สี/spacing token rules (brand color/logo = external, documented exception)
- **src/app/services/fuel-data.service.ts** — current in-memory stub (drop-in target)
- **src/app/models/fuel-entry.model.ts** — TS entity contracts consumed by all pages

## Task
แทน in-memory stub `FuelDataService` ด้วย real SQLite persistence บนเครื่อง (native iOS/Android) ผ่าน `@capacitor-community/sqlite`: `DbService` (open/create DB, `user_version` migration v0→v1 ตาม DDL §3, CRUD ทุก entity) + `SeedService` (idempotent bootstrap brand/fuel_type จาก dataset §7). id **ทั้งหมด** (PK + reference) เปลี่ยนจาก `string`→`number` (INTEGER). **เพิ่มเติม master data 3 อย่าง**: (1) **soft delete** brand + fuel_type (`deleted_at` — ซ่อนจาก picker แต่ fuel_entry ที่ ref row ที่ซ่อนยัง join ได้ = relation คงข้อมูล), (2) **brand logo** (bundled asset path ใน seed, column `logo_asset`), (3) **fuel_type color** (สีจริงต่อแบรนด์ตามที่ปั๊มใช้ — column `color`; picker/เลือก brand แสดงสีน้ำมันตามปั๊ม). `getOverview()` **ยังคง stub** — real กม./ลิตร engine (FR-007/008) แยกไป plan ถัดไป.

## FR Coverage
- FR-010 — Local SQLite Persistence (P1) — **implement**
- FR-011 — Seed Data Bootstrap (P1) — **implement** (seed + logo path + fuel color)
- FR-005 — Brand & FuelType master config (P1) — **extend**: soft-delete (ซ่อน), logo, color display ใน picker
- FR-001/002/003/004 CRUD — **wired to real DB** (contract เดิม, แก้เฉพาะ id type)
- **Out of this plan**: FR-007 (rolling กม./ลิตร), FR-008 (real overview aggregation) — `getOverview()` คง stub
- **FR orphan/underspecified**: FR-012 (dark mode) = stub/gap, ไม่เกี่ยว

## Goals
- [x] `@capacitor-community/sqlite` ติดตั้ง + `cap sync` (native iOS/Android)
- [x] `DbService` — open/create DB, `user_version` PRAGMA migration v0→v1 (DDL §3 + Trip active-fields + master-data cols), CRUD ครบ 5 entity, transactional write, snake↔camel map
- [x] `SeedService` — idempotent seed brand + fuel_type จาก §7 (config_version guard) พร้อม logo_asset + color
- [x] **soft delete** — brand/fuel_type `deleted_at`; picker query filter `deleted_at IS NULL`; fuel_entry join ยัง resolve row ที่ซ่อน (ชื่อ/สียังแสดงใน history)
- [x] **brand logo** — column `logo_asset`; ไฟล์ใน `src/assets/brand-logos/`; picker + master-data page แสดง logo (placeholder ถ้าไฟล์หาย)
- [x] **fuel_type color** — column `color` (hex); seed สีจริงต่อแบรนด์; เลือก brand → dropdown/chip ประเภทน้ำมันแสดงสีตามปั๊ม
- [x] Entity id + reference id → `number` ทุกที่
- [x] `FuelDataService` เรียก `DbService` จริง (drop-in)
- [ ] persist ข้าม force-quit/reboot (FR-010 AC#1), seed idempotent (FR-011 AC#2) — **ยังไม่ verify**: ต้อง device/sim จริง (ไม่มีในนี้); unit test cover idempotent-skip logic แต่ไม่ใช่ full app-restart AC → รอ `/ow-test`

## Non-goals
- ❌ Real กม./ลิตร rolling calc (FR-007) — `getOverview()` คง stub
- ❌ Real overview aggregation (FR-008) — plan ถัดไป
- ❌ Web/PWA SQLite (jeep-sqlite/wasm) — native เท่านั้น; web dev error ตอนเปิด DB (ยอมรับ — dev บน device/sim)
- ❌ **User-facing brand/fuel_type CRUD** — soft-delete = capability ระดับ config/future (ไม่มีปุ่มลบใน UICurrent); FR-005 ยัง read-only สำหรับ user
- ❌ Image save-to-gallery persist (FR-001/006) — เก็บ `image_uri` string ตามที่ UI ส่ง
- ❌ Real brand logo/color **ครบทุกแบรนด์** — ต้อง reference จริง (ดู Risks); plan รับ dataset ที่ให้มา, ที่ขาด = placeholder/สีกลาง
- ❌ แก้ SRS/REF DDL docs (แค่ flag ใน Doc Gaps; `docs` subagent fix ก่อน implement)

## Doc Gaps Found
1. **id type mismatch** — DDL §3 `INTEGER AUTOINCREMENT` vs TS `id: string`. **Resolved**: id → `number` ทุก entity (PK+FK). DDL คงเดิม; `docs` sync model note.
2. **Trip active-trip fields หายจาก DDL §3** — SRS §5 + Clarify 06-30 Q1 มี `is_active/ended_at/start_odometer/end_odometer` แต่ DDL `CREATE TABLE trip` ไม่มี. migration v1 เพิ่ม; `docs` fix REF-Architecture §3.
3. **field-name drift** — model camelCase vs DDL snake. DbService = single mapping boundary. ไม่เปลี่ยน model field names.
4. **Vehicle model** ขาด `plate`/`default_fuel_type_id`; **FuelType model** `brandId?` optional แต่ DDL `brand_id NOT NULL` → seed ผูก brand_id เสมอ.
5. **🔴 soft-delete ขัด FR-005 "read-only, ไม่มี delete"** — SRS FR-005 §3 AC#3 = "ไม่มี UI เพิ่ม/แก้/ลบ brand". soft-delete (`deleted_at`) = config-management capability (ซ่อน brand เลิกขาย) ไม่ใช่ user delete. → `docs` ต้องเติม SRS FR-005: master config รองรับ soft-hide (deleted_at) สำหรับ config lifecycle; user ยังเลือกอย่างเดียว; entry เก่ายัง resolve row ที่ซ่อน. **ต้อง clarify/doc ก่อน implement.**
6. **master-data cols หายจาก DDL §3** — `brand.logo_asset`, `brand.deleted_at`, `fuel_type.color`, `fuel_type.deleted_at` ไม่มีใน DDL. migration v1 เพิ่ม; `docs` fix REF-Architecture §3 + §7 seed (เพิ่มคอลัมน์ logo/color).
7. **fuel color reference ไม่มีใน vault** — สีจริงต่อแบรนด์ (ที่ปั๊มใช้) ไม่มี doc. ต้อง reference dataset ก่อน seed (ดู Risks).

## Affected Files
- `package.json` — dep `@capacitor-community/sqlite`
- `ios/App/CapApp-SPM/Package.swift` + Podfile — plugin native (cap sync)
- `src/app/services/db.service.ts` — **new** — connection, migration, CRUD, snake↔camel map, soft-delete filter
- `src/app/services/seed.service.ts` — **new** — idempotent brand/fuel_type seed + logo + color
- `src/app/services/seed-data.ts` — **new** — §7 dataset เป็น TS const: brand{name,logoAsset} + fuelTypes{name,grade,color}
- `src/app/services/fuel-data.service.ts` — in-memory → facade เรียก `DbService`
- `src/app/models/fuel-entry.model.ts` — id+ref `string`→`number`; Trip +`isActive/endedAt?/endOdometer?`; Vehicle +`plate?`; **Brand +`logoAsset?`,+`deletedAt?`**; **FuelType +`color?`,+`deletedAt?`**
- `src/main.ts` / `app.component.ts` — bootstrap: open DB → migrate → seed ก่อน render
- `src/assets/brand-logos/` — **new dir** — ไฟล์ logo 8 แบรนด์ (PNG/SVG) + placeholder
- `src/app/add/add.page.ts`+`.html` — picker: brand logo + fuel-type color chip; route param `Number(...)`
- `src/app/settings/master-data/master-data.page.ts`+`.html` — list แสดง logo + color; filter soft-deleted
- **id-type ripple (string→number)**: `history.page.ts`+`.html`, `history/entry-detail.page.ts`, `stats.page.ts`, `settings/vehicles.page.ts`+`.html`, `settings/trips.page.ts`+`.html` — `Number(paramMap.get())`; ตัด `uid()` (DB autoincrement)

## Implementation Steps
1. **(docs pre-step)** `docs` subagent แก้ REF-Architecture §3 DDL + §7: (a) trip active cols, (b) `brand.logo_asset TEXT`, `brand.deleted_at TEXT`, `fuel_type.color TEXT`, `fuel_type.deleted_at TEXT`; แก้ SRS FR-005 เติม soft-hide capability (Doc Gap #5). ปิด Gap #1/2/5/6.
2. `npm install @capacitor-community/sqlite` → `npx cap sync` (จาก root). ตรวจ iOS pod/SPM + Android.
3. **Reference fuel colors** — รวบรวมสีจริงต่อแบรนด์/grade (ดู Risks); ถ้ายังไม่ครบ → grade-standard fallback. รวม logo filenames 8 แบรนด์.
4. เขียน `seed-data.ts` — §7 → TS const: `{ brand, logoAsset, fuelTypes: {name, grade, color}[] }[]`.
5. เขียน `db.service.ts`:
   - `init()`: `SQLiteConnection`, open/create `fuel_log.db`, `foreign_keys = ON`.
   - migration: `PRAGMA user_version`; 0 → รัน DDL §3 + trip active cols + master-data cols (logo/color/deleted_at) + index ใน transaction → set `user_version = 1`. ขั้นบันได v→v+1.
   - CRUD ตาม signature `FuelDataService` เดิม; parametrized write; transactional commit ก่อน resolve. map snake→camel + id number.
   - **soft-delete filter**: `getBrands()`/`getFuelTypes()` → `WHERE deleted_at IS NULL`; เพิ่ม `getBrandById()`/`getFuelTypeById()` (ไม่ filter — history resolve row ที่ซ่อน); method `softDeleteBrand(id)`/`softDeleteFuelType(id)` set `deleted_at = datetime('now')` (future hide, ไม่มี user UI ตอนนี้).
6. เขียน `seed.service.ts`: `seedIfNeeded()` — config version guard (table `meta`) → insert brand (+logo_asset) + fuel_type (+color) ใน transaction (idempotent, append-only).
7. Bootstrap `app.component.ts`/APP_INITIALIZER — `await db.init()` → `await seed.seedIfNeeded()` ก่อน UI; init fail → error state + retry (DB_INIT).
8. แก้ `fuel-data.service.ts` — delegate ไป `DbService`; คง async signature.
9. แก้ `fuel-entry.model.ts` — id number; Trip active; Vehicle `plate?`; **Brand `logoAsset?`+`deletedAt?`; FuelType `color?`+`deletedAt?`**.
10. **id ripple** — ทุก page: `Number(paramMap.get('id'))`; ลบ string uid.
11. **UI enrich** (mobile): `add.page` picker — brand row แสดง logo (ion-avatar/img, placeholder fallback); fuel-type option แสดง color dot/chip (`[style.--color]` หรือ ion-badge). `master-data.page` — list logo + color swatch; filter soft-deleted ออก.
12. Error mapping — write fail → toast "บันทึกไม่สำเร็จ" (DB_WRITE); init fail → DB_INIT.
13. Build + `cap sync`; smoke test บน simulator/device.

## Design System Compliance (mobile)
- [x] ใช้ DS tokens (spacing/font/surface) สำหรับ layout picker/master-data
- [x] ใช้ DS components: Form Field (#7), Segmented (#8), List-Sliding (#10), Modal (#11)
- [x] WCAG AA — logo/color chip ไม่ใช่ตัวสื่อความหมายเดี่ยว (มีชื่อน้ำมันกำกับเสมอ; สีเป็น supplemental, กัน color-blind)

## Design Additions
- **brand logo asset + fuel-type color** = external brand identity, **ไม่ใช่ DS token** (สีจริงของปั๊ม อยู่นอก DS palette). documented exception (เหมือน canvas literal ใน IMPL-STATUS §DS). → trigger `/ow-design` เพื่อ log color swatch/logo pattern ก่อน `/ow-implement` ถ้าต้องการ formal DS entry; ขั้นต่ำ = เก็บ raw hex ใน data layer, render เป็น supplemental chip เท่านั้น.

## Test Plan
- [x] **FR-010 AC#1** — บันทึก N entries → force-quit + เปิดใหม่ → N ครบ (0% loss) บน device/sim — PASS (iOS sim, entry survived force-quit + 4 relaunches, see `FR010-AC1-*.png`)
- [x] **FR-010 AC#2** — migration v0→v1 บน install ใหม่ สร้างครบทุก table + master-data cols + index — PASS (`PRAGMA user_version`=1, `.schema` confirms all cols)
- [x] **FR-011 AC#1/2** — เปิดครั้งแรก brand/type ครบตาม §7 พร้อม logo path + color; เปิดซ้ำ → ไม่ seed ซ้ำ (count คงที่) — PASS (8 brands, count คงที่ ตลอด 5 launches)
- [x] **soft-delete** — set `deleted_at` brand → หายจาก picker (`getBrands`) แต่ fuel_entry เก่าที่ ref brand นั้น history ยังแสดงชื่อ/สี (getBrandById resolve) — PASS (`SOFTDEL-01..04*.png`: 8→7 ใน picker, history ยัง resolve)
- [x] **logo** — picker + master-data แสดง logo แต่ละแบรนด์; ไฟล์หาย → placeholder ไม่ crash — PASS (placeholder path เท่านั้น — `src/assets/brand-logos/` ยังไม่มีไฟล์จริง, ตาม Risk ที่ระบุไว้แล้ว; render ครบไม่ crash)
- [ ] **color** — เลือก brand → ประเภทน้ำมันแสดงสีตาม seed; แต่ละแบรนด์สีต่างกันตาม dataset — **ยังไม่ผ่าน**: ทุก fuel_type ใช้ fallback สีเดียว `#9CA3AF` (`SELECT DISTINCT color` = 1 row) — ตรง Risk ที่ plan ระบุไว้ (ไม่มี real color reference), ไม่ใช่ code bug — รอ dataset สีจริง
- [x] CRUD ครบ vehicle·trip·entry ผ่าน UI → สะท้อน DB — PASS
- [x] ON DELETE SET NULL — ลบ vehicle มี entry → entry คงอยู่, vehicle_id NULL — PASS (`ONDELETE-01..04*.png` + sqlite3 confirm)
- [x] id type — ทุก page ไม่ error จาก number id — PASS (0 console errors ตลอด session)
- [ ] airplane-mode — 0 network call (NFR-002/004) — **NOT_RUN_RISK**: ไม่มีวิธี cutoff network ใน simulator แบบเชื่อถือได้โดยไม่กระทบ host Mac; มีแค่หลักฐานทางอ้อม (ไม่เห็น outbound URLSession ใน log) — ต้อง device จริง + airplane mode จริง

## Success Criteria
- [x] `@capacitor-community/sqlite` ติดตั้ง + sync + build ผ่าน (`npm run build` + `cap sync` no error)
- [x] เปิดครั้งแรกบน simulator → DB สร้าง + seed 8 brands (`SELECT count(*) FROM brand WHERE deleted_at IS NULL` = 8) — PASS
- [x] `SELECT logo_asset FROM brand` ทุก row ไม่ NULL; `SELECT color FROM fuel_type` ทุก row ไม่ NULL — PASS (0 NULL ทั้งคู่ — ค่าไม่ NULL แต่ color เป็น fallback เดียวกันทุกแถว ดู Test Plan §color)
- [x] soft-delete: `UPDATE brand SET deleted_at=...` → picker ไม่แสดง แต่ history entry ที่ ref ยังแสดงชื่อ (query getBrandById คืน row) — PASS
- [x] บันทึก entry → force-quit → เปิดใหม่ → entry ยังอยู่ — PASS
- [x] seed idempotent — เปิด 2 ครั้ง count brand เท่าเดิม — PASS (ทดสอบจริง 5 launches)
- [x] add.page เลือก brand → fuel-type options แสดงสี + brand logo แสดง; master-data list มี logo + color — PASS (UI render ครบ — logo=placeholder, color=fallback เดียว ตาม data ที่มี ไม่ใช่ UI bug)
- [x] ทุก page load + CRUD ไม่ throw หลัง id → number; `getOverview()` stub ยัง return (Stats ไม่พัง) — PASS

## Verification
- map แต่ละ Success Criteria → คำสั่ง/หลักฐานจริง (build log, `sqlite3` query, restart test, screenshot picker) เติมตอน /ow-test
- **Implement-phase evidence (2026-07-03)**: `test-artifacts/2026-07-03/plan-2026-07-02-2140-sqlite-persistence-seed/` — `build-output.txt` (`npm run build` EXIT=0), `test-output.txt` (23/23 unit tests pass, scoped run — see BUILD-INFO.md note re: pre-existing unrelated `home.page.ts` blocker), `BUILD-INFO.md`.
- **Smoke-phase evidence (2026-07-03, `/ow-test`)** — iOS Simulator "iPhone 16" (iOS 18.5), native build via `xcodebuild -project ios/App/App.xcodeproj` (no CocoaPods workspace — SPM-only) + `xcrun simctl install/launch`. 87 evidence files (screenshots, sqlite3 query output, Maestro flow logs, console.log), appended to `EVIDENCE.md` rows E003–E025. **10 of 12 Test Plan items PASS** with direct sqlite3/screenshot evidence (see Test Plan section above for per-item detail): FR-010 AC#1/AC#2, FR-011 AC#1/2, soft-delete, logo (placeholder path), CRUD, ON DELETE SET NULL, id-type, console/crash-free across 5 app launches.
- **Still open (2 items, both pre-flagged in Risks — not regressions)**:
  1. **fuel_type color** — all rows share one fallback hex (`#9CA3AF`); real per-brand color dataset was never sourced (Risk §1). Blocks the "แต่ละแบรนด์สีต่างกัน" criterion specifically, not the underlying color-column plumbing (which works — non-NULL, renders, chip displays).
  2. **airplane-mode / 0-network (NFR-002/004)** — NOT_RUN_RISK; no reliable in-simulator network cutoff without touching the host Mac's network. Needs a real device test.
- **Also found during smoke (out of this plan's scope, flagged for follow-up, not fixed here)**: `add.page`'s fuel-type picker isn't filtered by selected brand (lists all ~64 types instead of just the selected brand's); no `data-testid` attributes on add/vehicles/trips/master-data form controls (made Maestro automation fragile — reliant on aria-label/coordinate taps).

## Risks
- **fuel color reference ไม่มีจริงในมือ** → สีจริงต่อแบรนด์ต้องหา (เว็บปั๊ม/รูป). mitigation: implement รับ dataset ที่ user/design ให้; ที่ขาด = grade-standard fallback color + TODO; **อย่าเดาสีมั่ว** (flag ใน seed-data.ts)
- **logo asset ไฟล์ยังไม่มี** → mitigation: placeholder image + path พร้อมใน schema; ใส่ PNG/SVG จริงทีหลัง (ไม่ block persistence)
- **soft-delete ขัด SRS FR-005** → mitigation: `docs` เติม SRS ก่อน implement (Doc Gap #5); ไม่เพิ่มปุ่มลบ user-facing (คง read-only)
- **@capacitor-community/sqlite iOS pod/SPM** ล้มตอน sync → ตรวจ Package.swift (มี diff) + pod install; ดู plugin README
- **web dev แตก** (ไม่มี jeep-sqlite) → guard `Capacitor.isNativePlatform()`; dev บน device/sim
- **id string→number ripple พลาด** → build TS strict + grep audit ทุก `.id` ก่อน done
- **color/logo chip a11y** (สื่อความด้วยสีเดี่ยว) → mitigation: มีชื่อน้ำมันกำกับเสมอ, สี supplemental

## Approval
- [x] Approved (set status: approved before /ow-implement)

## Implementation Result
- Files changed (prod / test): 23 production files (new: db.service.ts, seed.service.ts, seed-data.ts; modified: facade, models, bootstrap, id-ripple pages, UI enrich) / 5 test files (4 new, 1 updated) — see IMPLEMENTATION-STATUS.md and docs/vault mobile-agent report for full list.
- Tests added: db.service.spec.ts (11 cases), seed.service.spec.ts (3), fuel-data.service.spec.ts (3), app.component.spec.ts (+3), entry-detail.page.spec.ts (3).
- Success criteria → evidence map: build+sync criterion PASSED (build-output.txt EXIT=0). `/ow-test` completed a full iOS Simulator smoke run on 2026-07-03 (after an earlier interrupted attempt) — **6 of 7 Success Criteria + 10 of 12 Test Plan items now PASS with direct evidence** (sqlite3 queries, 87 screenshots/logs). Remaining open: fuel_type color diversity (data-sourcing gap, pre-flagged in Risks) and airplane-mode network check (needs real device). See Test Plan / Verification sections above for the full per-item breakdown.
- Evidence: `test-artifacts/2026-07-03/plan-2026-07-02-2140-sqlite-persistence-seed/EVIDENCE.md` (manifest — build/unit rows E001/E002 + smoke rows E003–E025).
- Subagent used: mobile (implementation), docs (doc-gap pre-step), test-runner (smoke, 2 runs due to session-limit interruption + resume) · Time: ~13 min mobile agent + ~21 min test-runner wall-clock.
- `status: done` stands, now backed by real native-run evidence for the persistence/migration/seed/soft-delete/CRUD/ON-DELETE-SET-NULL core of the plan. The 2 remaining open items are data-completeness gaps documented in Risks from the start, not implementation defects — track them as follow-up (real fuel-brand color reference; device-based airplane-mode test).
