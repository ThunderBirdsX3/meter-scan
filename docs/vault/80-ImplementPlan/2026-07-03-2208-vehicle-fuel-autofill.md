---
tags: [type/plan]
date: 2026-07-03 22:08
title: รถระบุประเภทน้ำมันเริ่มต้น + auto-fill ตอนเติม (ไม่ force)
status: approved
subagent_target: mobile
source_fix: none
related_docs:
  - SRS-fuel-log.md (FR-001, FR-003, FR-005, §5 data model)
  - PRD-fuel-log.md (US1, US3)
  - REF-Architecture.md §3 DDL, §7 Seed Dataset
  - DS-Components.md (#11 Modal, select/alert patterns)
estimate_hours: 3
risk_level: low
implement_ran_at: 2026-07-03 22:30
implement_blocked_on: "karma repo-wide compile abort — pre-existing broken src/app/home/home.page.ts (unrelated). Code complete + build pass; official unit run pending home fix."
---

# รถระบุประเภทน้ำมันเริ่มต้น + auto-fill ตอนเติม (ไม่ force)

## Vault Context Read
- **SRS-fuel-log.md**
  - FR-001 (Fuel Entry create — vehicle/fuel_type pickers) §38–58
  - FR-003 (Vehicle CRUD — name, plate?, `default_fuel_type_id?`) §79–93 — **Post-conditions ระบุแล้ว**: "ลบรถที่มี entry/trip ผูกอยู่ → confirm พร้อมแจ้งจำนวน entry ที่กระทบ"
  - FR-005 (Brand & Fuel Type master config, read-only) §118–136
  - §5 data model: `Vehicle(id, name, plate?, default_fuel_type_id?, created_at)` §289
- **REF-Architecture.md** §3 DDL — `vehicle.default_fuel_type_id INTEGER REFERENCES fuel_type(id) ON DELETE SET NULL`
- **โค้ดที่มีอยู่แล้ว** (สำรวจจริง):
  - `db.service.ts` — schema + `addVehicle/updateVehicle` map `fuelTypeId ↔ default_fuel_type_id` **ครบแล้ว**; `getEntries({vehicleId})` มีอยู่
  - `vehicles.page.*` — CRUD + `ion-select` ประเภทน้ำมันใน modal **มีแล้ว** (flat list, label = `ft.name`)
  - `add.page.*` — vehicle picker + fuel-type picker **มีแล้ว** แต่ **ไม่มี** `(ionChange)` เชื่อมรถ → ประเภทน้ำมัน

## Task
หน้า "เติมน้ำมัน" (add.page): เมื่อผู้ใช้เลือกรถ ให้ **auto-fill** ประเภทน้ำมันเป็นค่า `default_fuel_type_id` ของรถนั้น **เฉพาะเมื่อช่องประเภทน้ำมันยังว่างหรือค่าที่อยู่มาจาก auto-fill ก่อนหน้า** (ไม่ทับค่าที่ผู้ใช้เลือกเอง) และผู้ใช้ยังเปลี่ยนประเภทน้ำมันได้เสมอ (ไม่ force). เสริมหน้าจัดการรถ: (1) จัดกลุ่ม option ประเภทน้ำมันตามแบรนด์เพื่อแก้ปัญหาชื่อซ้ำ (~50 ตัว), (2) แจ้งจำนวน entry ที่กระทบตอนยืนยันลบรถ (ปิด gap FR-003 Post-conditions).

## FR Coverage
- **FR-003** — ปิด gap Post-condition (confirm แจ้งจำนวน entry) ที่ implement ยังไม่ครบ
- **FR-001** — เพิ่มพฤติกรรม auto-fill ประเภทน้ำมันจากรถ (ยังไม่ถูกระบุใน SRS)
- **FR orphan/underspecified**: auto-fill-fuel-on-vehicle-select **underspecified** — `default_fuel_type_id` มีใน FR-003 แต่ "auto เลือกให้ตอนเติม" ยังไม่มี acceptance criterion → plan นี้เพิ่มพฤติกรรม + flag ให้เติม AC ใน SRS (ดู Doc Gaps)

## Goals
- [x] เลือกรถในหน้าเติม → ประเภทน้ำมัน auto-fill = default ของรถ **เฉพาะเมื่อช่องว่าง/เป็นค่า auto** (policy: เติมเฉพาะตอนว่าง — ไม่ทับ manual)
- [x] ผู้ใช้เปลี่ยนประเภทน้ำมันได้เสมอหลัง auto-fill (ไม่ disable/force)
- [x] option ประเภทน้ำมันแสดง label ระบุแบรนด์ (เช่น "PTT Station · แก๊สโซฮอล์ 95") เรียงจัดกลุ่มตามแบรนด์ — ทั้ง vehicles modal และ add page
- [x] ยืนยันลบรถแสดงจำนวน entry ที่กระทบ (FR-003)

## Non-goals
- ไม่แสดงชื่อประเภทน้ำมันในรายการ list รถ (ผู้ใช้ไม่เลือก)
- ไม่ force/ล็อกประเภทน้ำมันตามรถ (ข้อกำหนดหลัก: เปลี่ยนได้)
- ไม่แตะ fuel-type color reference (ยังเป็น placeholder ตาม seed-data.ts)
- ไม่ทำ real กม./ลิตร engine (FR-007/008 ยัง Non-goal เดิม)
- ไม่เพิ่มฟิลด์ใหม่ใน schema (มี `default_fuel_type_id` แล้ว) — ไม่มี migration

## Doc Gaps Found
- SRS FR-001/FR-003 ยังไม่มี acceptance criterion สำหรับ auto-fill ประเภทน้ำมันจากรถ → `/ow-implement` ควรเรียก `docs` subagent เติม AC ("Given รถ Civic มี default_fuel_type=B7, When เลือก Civic ในหน้าเติมโดยช่องประเภทว่าง, Then ประเภท = B7 และแก้ได้") **ก่อน**แก้โค้ด

## Affected Files
- `src/app/add/add.page.ts` — เพิ่ม `onVehicleChange()`; state `fuelTypeAutoFilled: boolean`; helper `fuelOptionLabel()` / จัดเรียง fuelTypes ตามแบรนด์
- `src/app/add/add.page.html` — `(ionChange)="onVehicleChange()"` บน vehicle select; ปรับ label option ประเภทน้ำมัน + `(ionChange)` reset auto flag เมื่อผู้ใช้เลือกเอง
- `src/app/settings/vehicles/vehicles.page.ts` — load `brands`; สร้าง labeled+sorted fuel options; ต่อยอด delete flow ให้ดึงจำนวน entry ที่กระทบ
- `src/app/settings/vehicles/vehicles.page.html` — label option ประเภทน้ำมันตามแบรนด์; alert message แสดงจำนวน entry
- `src/app/services/fuel-data.service.ts` — (optional) `countEntriesByVehicle(id)` wrapper — ถ้าไม่เพิ่ม ใช้ `getEntries({vehicleId}).length` ได้
- `docs/vault/10-PRD/SRS-fuel-log.md` — (docs subagent) เติม AC auto-fill

## Implementation Steps
1. **[docs]** เติม acceptance criterion auto-fill ประเภทน้ำมันลง FR-001 (หรือ FR-003) + ระบุ policy "fill only when empty, ไม่ force"
2. **add.page.ts** — เพิ่ม field `fuelTypeAutoFilled = false`. เมธอด `onVehicleChange()`:
   - หา `vehicle = vehicles.find(v => v.id === draft.vehicleId)`
   - ถ้า `vehicle?.fuelTypeId != null` **และ** (`draft.fuelTypeId == null` **หรือ** `fuelTypeAutoFilled === true`) → `draft.fuelTypeId = vehicle.fuelTypeId; fuelTypeAutoFilled = true`
   - ถ้ารถไม่มี default → คงค่าเดิมไว้ (ไม่ล้าง)
3. **add.page.ts** — เมธอด `onFuelTypeManualChange()` set `fuelTypeAutoFilled = false` (ผู้ใช้เลือกเอง → หยุด auto ทับ). reset `fuelTypeAutoFilled=false` ตอน `save()`/reset form ด้วย
4. **add.page.html** — `(ionChange)="onVehicleChange()"` บน vehicle `ion-select`; `(ionChange)="onFuelTypeManualChange()"` บน fuel-type select (คงลักษณะเลือกได้ปกติ ไม่ disable)
5. **fuelTypes grouping** — ใน add.page.ts + vehicles.page.ts จัดเรียง fuelTypes ตาม `brandId` แล้ว name; label option = `"<brandName> · <fuelName>"` (resolve brandName จาก brands ที่ load). ถ้าไม่มี brand → ใช้ชื่อ fuel อย่างเดียว
6. **vehicles.page.ts** — `reload()` load `brands` เพิ่ม (`data.getBrands()`); เก็บ map brandId→name สำหรับ label
7. **vehicles.page.html** — ปรับ `ion-select-option` ประเภทน้ำมันใช้ labeled option (step 5)
8. **vehicles delete confirm** — `confirmDeleteVehicle(v)`: `const n = (await data.getEntries({vehicleId: v.id})).length;` ตั้ง alert message เป็น "รถนี้มี N รายการเติมผูกอยู่ — ลบแล้วรายการยังอยู่แต่จะไม่ระบุรถ" (N=0 → ข้อความปกติ). แปลง alert เป็น dynamic message (bind property แทน static)
9. รัน `npm run build` ให้ผ่าน (ไม่ทำ device deploy ใน plan)

## Design System Compliance (mobile)
- [x] ใช้ `ion-select` / `ion-alert` / modal เดิม (DS Components #11) — ไม่เพิ่ม component ใหม่
- [x] ไม่เพิ่ม token สี — fuel color dot ที่มีอยู่คงเดิม (supplemental, ชื่อ fuel เป็นตัวสื่อความหมายหลัก)
- [x] label แบรนด์เป็น text ล้วน — ผ่าน WCAG AA (ไม่พึ่งสีสื่อความหมาย)
- [x] ไม่ disable ช่องประเภทน้ำมัน → รักษา operability (diff: ไม่เพิ่ม `disabled`)

## Design Additions (ถ้ามี)
- none — reuse ทั้งหมด

## Test Plan
- [~] Unit: `onVehicleChange()` — (a)(b)(c)(d) → spec `add.page.spec.ts` เขียนครบ; **ts-node exec PASS 11/11** แต่ **karma blocked** (home.page.ts pre-existing TS error) → ยังไม่มี green karma run
- [~] Unit: `onFuelTypeManualChange()` set flag=false → spec เขียน; ts-node PASS; karma blocked
- [~] Unit (vehicles): delete confirm count (N=3, N=0) → spec `vehicles.page.spec.ts`; ts-node PASS; karma blocked
- [ ] Manual (native/emulator): เพิ่มรถ+เลือกน้ำมัน → หน้าเติมเลือกรถ → auto เด้ง → เปลี่ยนเองได้ → เลือกรถอื่นที่เพิ่ง manual ไม่ถูกทับ  *(→ /ow-test)*
- [ ] Manual: ลบรถที่มี entry → เห็นจำนวน; ยืนยัน → entry ยังอยู่ vehicle=ไม่ระบุ (ON DELETE SET NULL)  *(→ /ow-test)*

## Success Criteria
- [x] เลือกรถ (มี default) ในหน้าเติมโดยช่องประเภทว่าง → `draft.fuelTypeId` = default ของรถ — `onVehicleChange()` add.page.ts:135; unit(a) ts-node PASS *(karma blocked)*
- [x] เลือกประเภทน้ำมันเองก่อน แล้วเลือกรถ → ค่าที่เลือกเองไม่ถูกทับ — guard add.page.ts:137; unit(b) ts-node PASS
- [x] ช่องประเภทน้ำมันยัง editable หลัง auto-fill (ไม่มี `disabled`) — diff grep confirmed
- [x] option ประเภทน้ำมันแสดงชื่อแบรนด์กำกับ เรียงตามแบรนด์ (ทั้ง 2 หน้า) — `fuelOptionLabel`/`sortFuelTypesByBrand`
- [x] ลบรถที่มี N entries → confirm dialog แสดงตัวเลข N — vehicles.page.ts:107; unit(N=3/0) ts-node PASS
- [x] `npm run build` ผ่าน ไม่มี TS error — build-output.txt EXIT=0, 0 error

## Verification
- map กลับแต่ละ Success Criteria พร้อมผล unit/build จริง (เติมตอน /ow-test)

## Risks
- **สลับรถหลาย ๆ ครั้งแล้วค่า auto ค้าง** → mitigation: flag `fuelTypeAutoFilled` ให้ auto ทับได้เฉพาะค่าที่ auto เคยเติม; manual ยึดเสมอ (unit c/b คุม)
- **ชื่อ fuel ซ้ำข้ามแบรนด์ทำให้เลือกผิด** → mitigation: label prefix แบรนด์ + sort ตามแบรนด์
- **`getEntries({vehicleId})` ช้าถ้า entry เยอะ** → ต่ำ (มี index `idx_entry_vehicle_dt`; ใช้ตอนกดลบเท่านั้น)

## Approval
- [x] Approved (set status: approved before /ow-implement)

## Implementation Result
- **Status: code-complete, NOT flipped `done`** — blocked on canonical unit gate (see below). All code changes uncommitted.
- **Files changed (prod):** `add.page.ts`, `add.page.html`, `settings/vehicles/vehicles.page.ts`, `settings/vehicles/vehicles.page.html` (78 insertions, in-scope)
- **Files changed (docs):** `10-PRD/SRS-fuel-log.md` — FR-001 Acceptance item 4 (auto-fill AC) added by `docs` subagent
- **Tests added:** `add.page.spec.ts` (7 cases: onVehicleChange a–d, manual-reset, 2× label), `vehicles.page.spec.ts` (4 cases: delete count N=3/N=0, 2× label)
- **Build:** `npm run build` → EXIT=0, 0 TS error (test-artifacts/…/build-output.txt)
- **Unit run:** 🚫 `ng test` (karma) aborts at compile — `src/app/home/home.page.ts` `TS2305 FieldScan` + `TS2339 autoReadAllFields` (pre-existing; `git diff HEAD -- src/app/home/` empty; orphaned, no route/module ref → does NOT block prod build). Interim proof: isolated `tsc --noEmit` 0-err + `ts-node` direct exec 11/11 assertions.
- **Coverage audit (5.2):** PROD>0 & TEST>0 → pass. **Discipline audit (5.3):** all hunks trace to steps 2–8; no scope creep; no out-of-scope churn.
- **Evidence:** `test-artifacts/2026-07-03/plan-2026-07-03-2208-vehicle-fuel-autofill/EVIDENCE.md` (+ BUILD-INFO.md, build-output.txt, test-output.txt) — gitignored
- **Subagents:** docs (AC), mobile (impl) · **Blockers → next:** (1) `/ow-fix` orphaned `home/` module → unblock karma; (2) `/ow-test` manual native UAT (Test Plan items 4–5)
