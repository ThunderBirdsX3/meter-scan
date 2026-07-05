---
tags: [type/plan]
date: 2026-07-05 19:30
title: รถ — เลือกประเภท/ไอคอน (จยย/บิ๊กไบค์/สกู๊ตเตอร์/เก๋ง/SUV/PPV/ตู้/บรรทุก) + custom SVG
status: done
completed_at: 2026-07-05 21:05
subagent_target: mobile
related_docs:
  - "[[SRS-fuel-log]]"
  - "[[REF-Architecture]]"
  - "[[DS-Tokens]]"
  - "[[PRD-fuel-log]]"
estimate_hours: 4
risk_level: medium
---

# รถ — เลือกประเภท + ไอคอน (custom SVG icon set)

> ชุด plan นี้มาจาก UAT feedback รอบเล่นด้วยมือ 2026-07-05 (batch 1/4). Plan อื่นในรอบ:
> [[2026-07-05-1935-trip-enable-disable]], [[2026-07-05-1940-settings-cleanup]], [[2026-07-05-1945-add-page-reorder]]

## Vault Context Read
- `[[SRS-fuel-log]]` — FR-003 (Vehicle CRUD). ปัจจุบันรถมี name/plate/default_fuel_type เท่านั้น
- `[[REF-Architecture]]` — §3 DDL (vehicle table), §schema-version staircase (ปัจจุบัน DB_VERSION=2)
- `[[DS-Tokens]]` — สีไอคอน list ใช้ `--color-text-muted` (ดู `.item-icon`); SVG ต้อง `currentColor` เพื่อรองรับ dark mode
- Code ปัจจุบัน: `src/app/services/db.service.ts` (DDL_V1 + MIGRATION_V1_TO_V2, DB_VERSION=2, rowToVehicle, add/updateVehicle), `src/app/models/fuel-entry.model.ts` (interface Vehicle), `src/app/settings/vehicles/vehicles.page.{ts,html}` (modal มี 3 field: name/plate/fuelType)

## Task
เพิ่ม **ประเภทรถ** ให้แต่ละคัน เลือกได้จาก 8 ประเภท (จยย, บิ๊กไบค์, สกู๊ตเตอร์, เก๋ง, SUV, PPV, ตู้, บรรทุก) หรือ **ไม่แสดงไอคอน**. เก็บเป็น column ใหม่ `vehicle.vehicle_type` (schema v3). แสดงเป็น **inline icon-chip grid** ในหน้า vehicle modal (ไม่ใช้ ion-select — ion-select-option ไม่รองรับ icon). หน้า list รถแสดงไอคอน SVG ที่เลือก แทน `car-outline` static; ถ้าไม่เลือกไม่แสดงไอคอน.

## ไม่ใช้ ion-select — เหตุผล
`ion-select-option` (Ionic 8) ไม่ render icon/image ทุก interface (action-sheet/popover/alert/modal). ต้องทำ picker เอง → inline icon-chip grid ในฟอร์ม modal: เห็นไอคอนครบ 8 อันพร้อมกัน แตะเลือก highlight state (UX ดีกว่า dropdown สำหรับเลือกไอคอน).

## FR Coverage
- **FR-003** (Vehicle CRUD) — ขยาย: เพิ่ม attribute `vehicleType`
- Doc Gap: SRS §5 data model ยังไม่มี `vehicle_type` → ต้องเติม (ดู Doc Gaps)

## Goals
- [x] schema v3: column `vehicle.vehicle_type TEXT` (nullable) + DB_VERSION=3 + migration v2→v3
- [x] 8 custom SVG asset ใน `src/assets/vehicle-icons/` (monochrome `currentColor`, dark-mode safe)
- [x] `Vehicle.vehicleType?: string` ใน model + map ใน db.service (rowToVehicle / add / update)
- [x] vehicle modal: inline icon-chip grid (8 chips + "ไม่แสดงไอคอน") แทนที่จะเป็น dropdown; selected state ชัด
- [x] list รถ: แสดง SVG ตามประเภทที่เลือก; null = ไม่มี slot icon
- [x] a11y: แต่ละ chip มี `aria-label` ภาษาไทย + role/aria-pressed สำหรับ selected

## Non-goals
- ไม่แตะ fuel-type / brand picker (คนละ plan)
- ไม่ทำไอคอนสีตามแบรนด์รถ (monochrome only)
- ไม่ backfill ประเภทรถให้ข้อมูลเดิม (nullable, ค่อยแก้เอง)

## Doc Gaps Found
- `[[SRS-fuel-log]]` §5 Vehicle data model — เพิ่ม field `vehicle_type` (enum 8 ค่า + null) → `docs` subagent
- `[[REF-Architecture]]` §3 DDL + schema-version — เติม migration v2→v3 (ALTER vehicle ADD vehicle_type), bump staircase → `docs` subagent

## Affected Files
- `src/assets/vehicle-icons/{motorcycle,bigbike,scooter,sedan,suv,ppv,van,truck}.svg` — **ใหม่** 8 ไฟล์, viewBox 0 0 24 24, `fill="currentColor"`, ไม่ hardcode สี
- `src/app/models/fuel-entry.model.ts` — เพิ่ม `vehicleType?: string;` ใน interface Vehicle (+comment: enum code, maps DDL `vehicle_type`)
- `src/app/services/db.service.ts`:
  - `DB_VERSION = 3`
  - เพิ่ม `MIGRATION_V2_TO_V3 = 'ALTER TABLE vehicle ADD COLUMN vehicle_type TEXT;'`
  - `migrate()`: `if (currentVersion < 3) { await db.execute(MIGRATION_V2_TO_V3, true); PRAGMA user_version = 3; }` (ALTER ADD COLUMN ปลอดภัยใน transaction — ไม่ต้อง toggle FK)
  - `VehicleRow` เพิ่ม `vehicle_type: string | null`
  - `rowToVehicle` map `vehicleType: r.vehicle_type ?? undefined`
  - `addVehicle` INSERT เพิ่มคอลัมน์ `vehicle_type`, param `v.vehicleType ?? null`
  - `updateVehicle` เพิ่ม `if ('vehicleType' in patch) { sets.push('vehicle_type = ?'); values.push(patch.vehicleType ?? null); }`
- `src/app/settings/vehicles/vehicles.page.ts`:
  - const `VEHICLE_TYPES: { code: string; label: string; asset: string }[]` (8 อัน)
  - `openVehicleModal` เก็บ `vehicleDraft.vehicleType`
  - `saveVehicle` ส่ง `vehicleType` ทั้ง add + update
  - helper `iconFor(v: Vehicle): string | null` คืน asset path หรือ null
- `src/app/settings/vehicles/vehicles.page.html`:
  - list `<ion-icon name="car-outline">` → `<img *ngIf="iconFor(v)" [src]="iconFor(v)" class="vehicle-type-icon" slot="start">` (ไม่มี slot ถ้า null)
  - modal: ลบ/แทน field เดิม (ถ้ามี) ด้วย icon-chip grid: `<div class="type-grid"><button *ngFor="let t of vehicleTypes" ...></button> + chip "ไม่แสดง"`
- `src/app/settings/vehicles/vehicles.page.scss` — `.type-grid` (flex-wrap), `.type-chip` (selected border ด้วย `--color-accent-*`), `.vehicle-type-icon` (size = `--font-lg`, `color: var(--color-text-muted)`)

## Steps
1. สร้าง 8 SVG (เรียบ, monochrome, currentColor). ใช้ ionicons เป็น reference แต่ต้องมีให้ครบ 8 ประเภท (จยย/บิ๊กไบค์/สกู๊ตเตอร์แยกทรง)
2. model + db.service: column + migration + map + CRUD (ทำก่อน เพื่อ compile ผ่าน)
3. vehicles.page.ts: VEHICLE_TYPES const + draft + iconFor
4. vehicles.page.html + scss: icon-chip grid ใน modal + list icon
5. `npm run build` → `npx cap sync` (จาก root)
6. UAT บน simulator: เพิ่มรถเลือกแต่ละประเภท, เลือก "ไม่แสดง", แก้ประเภทเดิม, ดู list render

## Risks
- **R1** ALTER ADD COLUMN บน DB ที่ user_version=2 อยู่แล้ว → ปลอดภัย (SQLite ADD COLUMN ไม่ rewrite table). ถ้า test บน DB v2 เดิม ต้องเห็น column เพิ่มโดยไม่ crash
- **R2** SVG currentColor — ถ้าใช้ `<img src>` **จะไม่รับ currentColor** (img แยก document). ทางแก้: ใช้ `<ion-icon [src]>` (Ionic inline SVG แล้ว currentColor ทำงาน) แทน `<img>`. **เปลี่ยน list + chip ให้ใช้ `<ion-icon [src]="asset">`** ไม่ใช่ `<img>` — สำคัญต่อ dark mode

## Test
- `db.service.spec.ts` — เพิ่ม case: migrate v2→v3 เพิ่ม column; addVehicle+vehicleType อ่านกลับได้; updateVehicle เปลี่ยน type
- Manual: 8 ประเภท + none render ถูกใน light + dark

## Implementation Result
- Files changed (prod): `src/assets/vehicle-icons/{motorcycle,bigbike,scooter,sedan,suv,ppv,van,truck}.svg` (new), `src/app/models/fuel-entry.model.ts`, `src/app/services/db.service.ts`, `src/app/settings/vehicles/vehicles.page.{ts,html,scss}`
- Files changed (test): `src/app/services/db.service.spec.ts`, `src/app/settings/vehicles/vehicles.page.spec.ts`
- Tests added: migrate v2→v3 adds `vehicle_type` column + bumps `user_version`; `addVehicle`/`updateVehicle` round-trip `vehicle_type`; `iconFor()` hit/null/unknown-code; `selectVehicleType()` set/clear
- Success criteria → evidence map: all 6 Goals checkboxes ticked above, each verified against independently re-run build+test (see below) — R2 (dark-mode `currentColor`) verified via `<ion-icon [src]>` usage, no `<img>`; no hardcoded colors in scss (DS tokens only)
- Evidence: `test-artifacts/2026-07-05/plan-2026-07-05-1930-vehicle-type-icons/EVIDENCE.md`, `BUILD-INFO.md`, `build-output.txt`, `test-output.txt`
- Subagent used: docs (doc gaps) → mobile (implementation) · Build: EXIT=0 · Test: 69/69 SUCCESS (independently re-run by orchestrator)
- Limitation: manual on-device UAT (8 types + none, light/dark render) not run — no simulator/device available in this environment; next step `/ow-test` or manual UAT on simulator
