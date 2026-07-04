---
tags: [type/plan]
date: 2026-07-04 09:21
title: Stats tab — real DB aggregation + rolling กม./ลิตร engine
status: done
completed_at: 2026-07-04 09:35
subagent_target: frontend
source_fix: none
related_docs:
  - SRS-fuel-log (FR-007, FR-008, FR-002 post-conditions)
  - REF-Architecture (§data model — fuel_entry, trip, vehicle)
  - IMPLEMENTATION-STATUS (getOverview stub, next-step FR-007/FR-008)
estimate_hours: 5
risk_level: low
---

# Stats tab — real DB aggregation + rolling กม./ลิตร engine

## Vault Context Read
- `SRS-fuel-log.md` — FR-007 (odometer + rolling กม./ลิตร, tank-to-tank convention, Clarify 2026-07-02 Q4), FR-008 (Overview reports trip/เดือน/รถ + AC1–AC5), FR-002 post-conditions (update/delete → overview recompute), FR-004 (trip active/ended, "ไม่ระบุทริป" fallback)
- `REF-Architecture.md` — data model: `fuel_entry(amount, liters, pricePerLiter, odometer, vehicleId, tripId, datetime)`, `trip(name, is_active)`, `vehicle(name)`
- `IMPLEMENTATION-STATUS.md` — `getOverview()` = fixed-number stub; next-step calls out real กม./ลิตร + aggregation (FR-007/FR-008)
- Code read: `fuel-data.service.ts:111-144` (stub), `db.service.ts:342-356` (`getEntries`, `getEntry`), `stats.page.ts` (calls `getOverview(segment)`), `fuel-entry.model.ts:48-92` (`FuelEntry`, `OverviewStats`, `StatGroupRow`)

## Task
แทนที่ `FuelDataService.getOverview()` ซึ่งตอนนี้ return ตัวเลข hardcoded ปลอม ด้วย engine คำนวณจริงจากข้อมูลใน SQLite. อ่าน fuel_entry ทั้งหมด (join ชื่อ vehicle/trip), จัดกลุ่มตาม segment ที่เลือก (trip/month/vehicle), รวมยอดเงิน/ลิตร/จำนวนครั้ง/ราคาเฉลี่ยต่อลิตร, และคำนวณ กม./ลิตร แบบ rolling tank-to-tank ต่อกลุ่ม (sub-group ต่อรถ แล้วรวม). ทำให้หน้า Stats สะท้อนข้อมูลจริงและอัปเดตตามการ add/edit/delete entry.

## FR Coverage
- FR-007 — odometer rolling กม./ลิตร (group-level) : **implement**
- FR-008 — Overview reports (trip/month/vehicle summary + group list) : **implement**
- FR orphan/underspecified: none (FR-007/FR-008 มี full AC; 2 spec gap ถาม user แล้ว 2026-07-04 — ดู Decisions)

## Decisions (clarified 2026-07-04)
- **D1 — multi-vehicle group km/L**: กลุ่ม month/trip ที่มีหลายรถ → sub-group ต่อ vehicleId ก่อน (odometer เทียบได้เฉพาะในรถเดียว), คำนวณระยะ+ลิตรที่นับต่อรถ, แล้ว `km/L = Σ(ระยะทุกรถ) ÷ Σ(ลิตรที่นับทุกรถ)`. ไม่ปน odometer ข้ามรถ.
- **D2 — per-row km/L**: เพิ่ม field `kmPerLiter?: number` ลง `StatGroupRow`; แต่ละแถวโชว์ km/L ของกลุ่มตัวเอง, `'—'` ถ้าคำนวณไม่ได้ (odometer < 2 จุด หรือ Σliters=0). ตรง FR-008 AC4.

## กม./ลิตร algorithm (per group, tank-to-tank — FR-007)
สำหรับ set ของ entries ในกลุ่ม (หรือ sub-group ต่อรถ):
1. กรองเฉพาะ entry ที่มี `odometer != null` และ `liters != null`.
2. ถ้าจำนวน entry ที่มี odometer < 2 → กลุ่มนี้คำนวณไม่ได้ (contribute 0/skip).
3. `distance = max(odometer) − min(odometer)`; ถ้า ≤ 0 → skip.
4. `litersCounted = Σ liters ของทุก entry **ยกเว้น** entry ที่ odometer ต่ำสุด` (baseline ไม่ถูกนับ — tank-to-tank).
5. รวมทุก sub-group: `groupKmPerLiter = Σdistance ÷ ΣlitersCounted` (ถ้า ΣlitersCounted > 0, ไม่งั้น undefined).
- Top summary card `kmPerLiter` = ใช้อัลกอริทึมเดียวกันกับ "ทุก entry รวมกัน" (sub-group ต่อรถ แล้วรวม).

## Goals
- [x] `getOverview(segment)` อ่านจาก DB จริง — ไม่มีตัวเลข hardcoded เหลือ
- [x] group ถูกต้องตาม 3 segment: trip (fallback "ไม่ระบุทริป"), month (label เดือน พ.ศ./ค.ศ. จาก `datetime`), vehicle (fallback "ไม่ระบุรถ")
- [x] summary card: totalAmount, totalLiters, fillCount, avgPricePerLiter คำนวณจริง
- [x] กม./ลิตร rolling tank-to-tank ต่อกลุ่ม + ต่อแถว (D1, D2)
- [x] empty state เมื่อไม่มี entry (FR-008 error handling)
- [x] unit test ครอบ AC ของ FR-007 + FR-008

## Non-goals
- ไม่ทำกราฟ bar/line (FR-008 DEFERRED Phase 2)
- ไม่แตะ schema/migration — ใช้ column ที่มีอยู่ (odometer, tripId, vehicleId, datetime)
- ไม่แก้ history/add/vehicles/trips pages (เชื่อม DB จริงอยู่แล้ว)
- ไม่ทำ date-range filter (นอก scope MVP)
- ไม่ author FN specs (แยก docs task)

## Doc Gaps Found
- `OverviewStats.kmPerLiter` comment ยังเขียน "stub: precomputed" ใน model — แก้ comment ตอน implement (ไม่ใช่ vault doc)
- FN-Overview spec ยังไม่มี (SRS §10 Traceability อ้างถึง) — log ไว้, แยก docs task ภายหลัง

## Affected Files
- `src/app/services/fuel-data.service.ts` — แทน `getOverview()` stub ด้วย real aggregation delegating to DB entries
- `src/app/services/db.service.ts` — (ถ้าจำเป็น) เพิ่ม `getEntriesWithNames()` หรือ resolve ชื่อ vehicle/trip; อาจ reuse `getEntries()` + `getVehicles()`/`getTrips()` map ใน service layer แทน (เลือกทางหลัง — ไม่แตะ db.service)
- `src/app/models/fuel-entry.model.ts` — เพิ่ม `kmPerLiter?: number` ลง `StatGroupRow`; แก้ comment `OverviewStats.kmPerLiter`
- `src/app/stats/stats.page.html` — โชว์ `kmPerLiter` ต่อแถว + empty state (ถ้ายังไม่มี)
- `src/app/services/fuel-data.service.spec.ts` — unit tests engine (new/extend)

## Implementation Steps
1. เพิ่ม `kmPerLiter?: number` ลง `StatGroupRow`; อัปเดต comment ของ `OverviewStats.kmPerLiter` (ไม่ใช่ stub แล้ว)
2. ใน `FuelDataService` เขียน private pure helper `computeKmPerLiter(entries)` ตาม algorithm ข้างบน (sub-group ต่อ vehicleId, tank-to-tank, undefined ถ้าคำนวณไม่ได้) — pure function, testable แยก
3. เขียน private helper `groupEntries(entries, segment, vehicleMap, tripMap)` → คืน `Map<label, FuelEntry[]>` (trip → tripName/"ไม่ระบุทริป", month → label เดือนจาก `datetime`, vehicle → vehicleName/"ไม่ระบุรถ")
4. เขียน real `getOverview(segment)`:
   a. โหลด `getEntries()`, `getVehicles()`, `getTrips()` → สร้าง id→name map
   b. summary: Σamount, Σliters, count, avgPricePerLiter = Σamount ÷ Σliters (0 ถ้า Σliters=0), kmPerLiter = computeKmPerLiter(ทุก entry)
   c. groupRows: ต่อกลุ่มคำนวณ amount/liters/count + kmPerLiter (computeKmPerLiter ต่อกลุ่ม)
   d. sort groupRows (month = ใหม่→เก่า; trip/vehicle = amount มาก→น้อย)
5. ลบ block ตัวเลข hardcoded ทั้งหมดใน `getOverview`
6. `stats.page.html`: render `row.kmPerLiter` (แสดง `'—'` ถ้า undefined) + ตรวจ empty state เมื่อ `overview.fillCount === 0`
7. เขียน/ขยาย unit tests: FR-007 AC1 (11.4 case), FR-008 AC1–AC4 (month sum, per-vehicle split, ไม่ระบุทริป, "—" เมื่อ odometer<2)
8. `npm run build` ผ่าน (EXIT=0); `ng test` spec ใหม่เขียว

## Design System Compliance (frontend)
- [x] km/L ต่อแถว reuse Summary Stat Card #9 / List row idiom เดิม — ไม่มี component ใหม่
- [x] ใช้ DS token เดิม (ไม่มีสี/spacing hardcode ใหม่)
- [x] `'—'` placeholder = text ปกติ, ไม่พึ่งสีสื่อความหมาย (WCAG AA)
- [x] empty state reuse pattern เดิมจาก history (ถ้ามี)

## Design Additions (ถ้ามี)
- none — ใช้ DS component เดิมทั้งหมด

## Test Plan
- [x] Unit: `computeKmPerLiter` — 2 จุด odo ปกติ (400÷35=11.4), odo<2 → undefined, ข้ามbaseline liters, multi-vehicle รวม Σdist/Σliters
- [x] Unit: `getOverview('month')` — 2 entry มิ.ย. (1050+700)=1750, count 2 (FR-008 AC1)
- [x] Unit: `getOverview('vehicle')` — รถ A/B แยกไม่ปน (AC2)
- [x] Unit: `getOverview('trip')` — entry ไม่มี tripId → กลุ่ม "ไม่ระบุทริป" (AC3)
- [x] Unit: km/L = "—" เมื่อไม่มีกลุ่มใด odo ≥ 2 จุด (AC4)
- [x] Manual: add entry จริง → เปิด Stats → ตัวเลขตรง (add→recompute verified live iOS sim: 0→1 ครั้ง, 0.0→10.0L, ios-30). แก้/ลบ = getOverview re-query path เดียวกัน (unit-covered). FR-002 post-condition ✓

## Success Criteria
- [x] `grep hardcoded sample numbers` ใน `getOverview` = 0 (ไม่มี 7738.21/14.2/"กรุงเทพ–เชียงใหม่" เหลือ) — orch grep = NONE
- [x] unit test FR-007 AC1: รถ A [odo10000/L40, odo10400/L35] → km/L = 11.4 ✓ ผ่าน
- [x] unit test FR-008 AC1: month มิ.ย. 2 entry = 1750฿ / count 2 ✓ ผ่าน
- [x] unit test FR-008 AC4: ไม่มี odo ≥ 2 จุด → row.kmPerLiter undefined → UI '—' ✓ ผ่าน
- [x] `npm run build` EXIT=0 (orch-verified)
- [x] Manual: Stats ตัวเลขตรงกับ entry ใน DB และเปลี่ยนตาม add (on-device /ow-test ios-30/31/32 ✓); edit/delete = re-query path เดียวกัน

## Verification
- **Unit** (orchestrator-verified 2026-07-04): `npm run build` EXIT=0 · `npx ng test --watch=false --browsers=ChromeHeadless` = 42/42 SUCCESS EXIT=0.
- **On-device smoke** (/ow-test 2026-07-04, iOS sim iPhone 16 Pro, real SQLite): 4/4 scenarios PASS via VISIBLE_MENU (tab bar). Evidence: `test-artifacts/2026-07-04/real-stats-aggregation/EVIDENCE.md` (ios-01…ios-32).
  - FR-008 empty state: 0 entries → ยอดรวม 0฿ / ครั้ง 0 / 0.0L / เฉลี่ย 0.00 / กม./ลิตร `—` + "ยังไม่มีข้อมูลในช่วงนี้" (no crash). ✓ (ios-02)
  - FR-008 AC2/AC3 segment toggle ทริป/เดือน/รถ: regroup, no crash. ✓ (ios-03/04)
  - FR-002 recompute: add 1 entry (10.0L) → Overview ครั้ง 0→1, ปริมาณ 0.0→10.0L, group "ไม่ระบุทริป" 1 ครั้ง·10.0L·`—`. ✓ (ios-30) — real DB aggregation, live recompute.
  - FR-008 AC2 group-name resolve: segment รถ → "Test Car QA" (name, not raw id). ✓ (ios-32)
  - FR-007/AC4 km/L `—` placeholder: shown when <2 odometer points. ✓
- **Note (NOT an engine defect):** ยอดรวม/เฉลี่ย ฿ showed 0 because the Add form saved `amount=0` (entered ลิตร+฿/ลิตร, no auto-derive). `getOverview()` faithfully computed Σamount=0 → avg 0.00 (correct per D-spec). Engine under test verified correct. Two add-page findings logged below (out of this plan's scope).

### Follow-up (out of scope — for /ow-fix, add.page.ts, pre-existing not regressions)
1. Stale vehicle list in Add form after adding a vehicle (needs relaunch to refresh) — likely missing refresh-on-enter (`ionViewWillEnter`).
2. Total ฿ not auto-derived from ลิตร×฿/ลิตร ("fill any 2 of 3") — saved amount=0.

## Implementation Result
- Files changed (prod): `src/app/services/fuel-data.service.ts` (real aggregation engine + `computeKmPerLiter` pure helper + `groupEntries`), `src/app/models/fuel-entry.model.ts` (`StatGroupRow.kmPerLiter?` + comment fix), `src/app/stats/stats.page.html` (per-row km/L in existing `.row-meta` idiom)
- Files changed (test): `src/app/services/fuel-data.service.spec.ts` (11 new/rewritten unit tests)
- Tests added: computeKmPerLiter ×5 (AC1 11.4, odo<2, baseline exclusion, multi-vehicle, empty) + getOverview ×6 (empty, month AC1, vehicle AC2, trip AC3, kmPerLiter AC4, avgPrice weighting)
- Success criteria → evidence map:
  - grep stub numbers = 0 → **PASS** (orch grep: NONE)
  - FR-007 AC1 km/L=11.4 → **PASS** (unit)
  - FR-008 AC1 month 1750฿/count 2 → **PASS** (unit)
  - FR-008 AC4 undefined→'—' → **PASS** (unit)
  - `npm run build` EXIT=0 → **PASS** (orch-verified)
  - Manual on-device Stats add/edit/delete → **DEFERRED /ow-test** (no device/sim this session)
- Build/test: `npm run build` EXIT=0 · `npx ng test --watch=false --browsers=ChromeHeadless` 42/42 SUCCESS EXIT=0 (agent + orchestrator both)
- Evidence: `test-artifacts/2026-07-04/real-stats-aggregation/EVIDENCE.md` (+ BUILD-INFO.md, orch-build/test-output.txt — gitignored)
- Subagent used: frontend   · DS gate: 0 violations   · Vault: IMPLEMENTATION-STATUS.md updated
- Deferred (logged, out of this plan's scope): FN-Overview spec authoring (separate docs task), manual UAT

## Risks
- odometer เป็น optional → หลาย entry ไม่มี → km/L "—" บ่อยตอนข้อมูลจริงยังน้อย → mitigation: algorithm skip อย่างปลอดภัย, UI แสดง '—' ชัดเจน, ไม่ throw
- ราคาเฉลี่ยต่อลิตร weighting: ใช้ Σamount÷Σliters (จริงตามเงิน) ไม่ใช่ average ของ pricePerLiter → mitigation: ระบุใน test, ตรง FR-008 "ค่าตรงกับผลรวมของ entry ใน DB"
- performance @1000 entries (NFR-001 ≤1s): aggregation เป็น O(n) in-memory หลัง query เดียว → mitigation: single `getEntries()` + map, ไม่ query ใน loop

## Approval
- [x] Approved (set status: approved before /ow-implement)
