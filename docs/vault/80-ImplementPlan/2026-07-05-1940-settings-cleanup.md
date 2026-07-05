---
tags: [type/plan]
date: 2026-07-05 19:40
title: Settings cleanup — ลบหน้าแบรนด์/ประเภท, เอา export+clear ออก, dark toggle ชิดขวา
status: done
completed_at: 2026-07-05 20:55
subagent_target: mobile
related_docs:
  - "[[SRS-fuel-log]]"
  - "[[FLOW-app-navigation]]"
  - "[[DS-Tokens]]"
estimate_hours: 1.5
risk_level: low
---

# Settings cleanup

> UAT feedback batch 3/4 (2026-07-05). อื่นๆ: [[2026-07-05-1930-vehicle-type-icons]], [[2026-07-05-1935-trip-enable-disable]], [[2026-07-05-1945-add-page-reorder]]

## Vault Context Read
- `[[SRS-fuel-log]]` — FR-005 (Brand/FuelType read-only view). หน้า master-data มาจาก plan [[2026-07-02-1526-settings-subpages-darkmode]]
- `[[FLOW-app-navigation]]` — §4/§5 ระบุ T4→MASTER route
- Code ปัจจุบัน: `src/app/settings/settings.page.html` (เมนู 3 ปุ่ม + toggle dark + export/clear placeholder + about), `settings-routing.module.ts` (route `master-data`), `src/app/settings/master-data/` (page ทั้งหมด)

## Task
1. **ลบหน้า master-data ทิ้งทั้งหมด** (folder + route + menu item) — ข้อมูล brand/fuel_type + seed **คงไว้** (ยัง power picker ในหน้า add). แค่ไม่มีหน้าจัดการให้ดู
2. **เอา "ส่งออกข้อมูล" + "ล้างข้อมูลทั้งหมด"** (placeholder disabled) ออกจากหน้า settings
3. **dark mode toggle ชิดขวาสุด** — เพิ่ม `slot="end"` บน ion-toggle

## FR Coverage
- **FR-005** — เดิมมี "read-only view" ของ brand/fuel type; plan นี้ลบ view ทิ้ง (ข้อมูลยังอยู่, ยังใช้ใน picker). ต้อง sync SRS ว่า FR-005 = seed/picker source เท่านั้น ไม่มีหน้า UI (ดู Doc Gaps)

## Goals
- [x] ลบ `src/app/settings/master-data/` ทั้ง folder
- [x] ลบ route `master-data` จาก `settings-routing.module.ts`
- [x] ลบ menu item "แบรนด์และประเภทน้ำมัน" จาก settings.page.html
- [x] ลบ 2 `ion-item` (export + clear-data) จาก settings.page.html — เก็บ "เวอร์ชัน" ไว้
- [x] ปรับ section "ทั่วไป" (เหลือแค่ about/เวอร์ชัน — comment หัวข้อปรับเป็น "Other")
- [x] dark toggle มี `slot="end"` → ชิดขวา
- [x] ไม่มี dangling import / broken build (build EXIT=0, lint EXIT=0)

## Non-goals
- ไม่ลบ table brand/fuel_type/brand_fuel, ไม่แตะ seed.service (ยังใช้ใน add picker)
- ไม่ทำ export/clear จริง (แค่เอา placeholder ออก)
- ไม่แตะ vehicles/trips route

## Doc Gaps Found
- `[[SRS-fuel-log]]` FR-005 — ปรับจาก "หน้า read-only view" → "master config เป็น seed/picker source, ไม่มีหน้าจัดการ" → `docs` subagent
- `[[FLOW-app-navigation]]` §4 mermaid + §5 — ลบ node MASTER ออกจาก nav map → `docs` subagent

## Affected Files
- `src/app/settings/master-data/` — **ลบทั้ง folder** (page.ts/html/scss/spec, module, routing)
- `src/app/settings/settings-routing.module.ts` — ลบ block route `master-data`
- `src/app/settings/settings.page.html`:
  - ลบ `<ion-item routerLink="master-data" ...>` (business-outline)
  - ลบ 2 placeholder items (download-outline export + trash-outline clear)
  - `<ion-toggle ...>` เพิ่ม `slot="end"`
  - ถ้า section "ทั่วไป" เหลือแค่ about → เก็บ header ไว้หรือ merge ตามความเหมาะสม
- `src/app/settings/settings.page.scss` — ถ้ามี style เฉพาะ export/clear/master ที่ไม่ใช้แล้ว ลบทิ้ง (`.item-icon--danger` ใช้เฉพาะ clear → ตรวจก่อนลบ)

## Steps
1. `rm -rf src/app/settings/master-data`
2. แก้ settings-routing.module.ts ลบ route
3. แก้ settings.page.html: ลบ 3 item (master/export/clear) + slot="end" บน toggle
4. `grep -rn "master-data\|MasterData" src/app` ยืนยันไม่เหลือ reference (ยกเว้น db/seed/fuel-data ที่เป็น data layer — คงไว้)
5. `npm run build` ผ่าน → `npx cap sync`
6. UAT: หน้า settings เหลือ รถ/ทริป + dark toggle (ชิดขวา) + เวอร์ชัน; navigate master-data (ถ้าพิมพ์ URL ตรง) ต้อง 404/redirect ไม่ crash

## Risks
- **R1** เผลอลบ data-layer ref ของ brand/fuel type → add picker พัง. **เฉพาะ folder settings/master-data เท่านั้น** — ห้ามแตะ db.service/seed.service/fuel-data.service
- **R2** route `master-data` ถูก deep-link จากที่อื่น → grep ยืนยันมีแค่ settings-routing

## Test
- `npm run build` clean
- Manual: settings layout ถูก, dark toggle ขวาสุด, add page ยังเลือกแบรนด์/ประเภทได้ (พิสูจน์ข้อมูลไม่หาย)

## Implementation Result
- Files changed (prod / test): 5 deleted (`master-data.page.ts/html/scss`, `master-data.module.ts`, `master-data-routing.module.ts`) + 1 test deleted (`master-data.page.spec.ts`, removed alongside its page) + 3 edited (`settings-routing.module.ts`, `settings.page.html`, `settings.page.scss`)
- Tests added: none — pure deletion + `slot="end"` attribute, untestable reason #1 (styling/layout, no new logic)
- Success criteria → evidence map: all 7 Goals checked above — verified independently via `git diff HEAD` scoped to task-owned files (matches plan Steps exactly, no unrelated hunks) + `npm run build` (EXIT=0) + `bun lint` (EXIT=0) + `grep -rn "master-data\|MasterData" src/app` (only data-layer refs remain: db.service/seed.service/fuel-data.service — R1/R2 risks confirmed clear)
- Evidence: `test-artifacts/2026-07-05/plan-2026-07-05-1940-settings-cleanup/EVIDENCE.md` (manifest), `BUILD-INFO.md`, `build-output.txt`, `lint-output.txt`
- Vault docs updated: `SRS-fuel-log.md` FR-005 reworded (seed/picker-only, no UI), `FLOW-app-navigation.md` §4/§5 MASTER node removed, `IMPLEMENTATION-STATUS.md` FR-005 row updated
- Subagent used: mobile (implementation) + docs (doc-gap fix)   · Time: ~14min mobile, ~3min docs
