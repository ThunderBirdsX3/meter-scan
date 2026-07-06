---
tags: [type/plan]
date: 2026-07-06 09:30
title: Add page — trip→vehicle autofill, FAB/inline save toggle, white save-button text
status: approved
subagent_target: mobile
source_fix: "[[2026-07-06-0920-add-page-trip-vehicle-autofill-and-fab-save]]"
related_docs:
  - 85-FixLog/2026-07-06-0920-add-page-trip-vehicle-autofill-and-fab-save
  - 70-Reference/DesignSystem/DS-Tokens.md (§2 action, §4 gradient, §3 contrast)
  - 70-Reference/DesignSystem/DS-Components.md
  - src/app/models/fuel-entry.model.ts (Trip.vehicleId)
estimate_hours: 2
risk_level: medium
---

# Add page — trip→vehicle autofill, FAB/inline save toggle, white save-button text

## Vault Context Read
- Fix-log `2026-07-06-0920-add-page-trip-vehicle-autofill-and-fab-save` — root cause + Success Criteria + Test Cases (ingested)
- DS-Tokens.md §2 — `--color-action-primary-*` (light: teal-700 + white text; **dark: teal-500 + DARK text #222428 by design**); `--color-text-inverse` flips per theme (line 138, 156, 163-165)
- DS-Tokens.md §3 — contrast table: teal-500 / **white** in dark = 3.74:1 → **FAILs AA 4.5** (line 220)
- DS-Tokens.md §4.2/4.4 — `--gradient-brand` (teal→emerald) is a **hero surface** that legitimately carries **white bold/large text** (AA large 3:1 ✓, line 252, 262-263); already used by tabs FAB
- add.page.ts / add.page.html / add.page.scss — current add-page implementation
- fuel-entry.model.ts — `Trip.vehicleId?` FK already exists (no schema change)

## Task
แก้หน้า add (เพิ่มการเติมน้ำมัน) 3 เรื่อง: (1) เลือกทริปที่ผูกรถ → auto-select รถ+ cascade fuel-type autofill;
(2) ปุ่มบันทึกแสดงเป็น FAB ลอยระหว่าง scroll ยังไม่ถึงล่างสุด แล้วสลับเป็นปุ่ม inline เดิมเมื่อถึงล่าง;
(3) ข้อความปุ่มบันทึกเป็นสีขาว — resolve ผ่านการใช้ `--gradient-brand` (DS hero surface, white bold text, AA-safe)
แทนการ override primary-contrast token (ซึ่งจะพัง AA ใน dark mode + กระทบปุ่ม primary อื่นทั้งแอป).

## FR Coverage
- FR-001 (บันทึกการเติม — 3 ฟิลด์อิสระ): plan นี้แตะ UX ของ entry form ไม่เปลี่ยน validation/logic การบันทึก
- ไม่มี FR ใหม่; ไม่มี FR orphan/underspecified ที่เกี่ยวข้อง (เป็น UX polish + 1 functional wiring)

## Goals
- [x] เลือกทริปที่มี `vehicleId` → `draft.vehicleId` ถูกตั้ง + `onVehicleChange()` cascade fuel-type autofill (TC-01)
- [x] เลือกทริป "— ไม่ระบุ —" หรือทริปไม่มี `vehicleId` → ไม่เขียนทับรถที่ผู้ใช้เลือกเอง (TC-02/02b)
- [x] scroll ยังไม่ถึงล่างสุด → ปุ่มบันทึกเป็น FAB; ถึงล่างสุด → ปุ่ม inline เดิม (FAB ซ่อน) (TC-03, logic; visual UAT → /ow-test)
- [ ] ข้อความปุ่มบันทึก (ทั้ง FAB + inline) เป็นสีขาว และผ่าน WCAG AA ทุก theme (implemented via `--gradient-brand`; manual AA verify pending /ow-test)
- [x] ทั้งสองปุ่มเรียก `save(entryForm)` ตัวเดิม — validation + reset ไม่เปลี่ยน (TC-04)

## Non-goals
- ไม่แตะ scan-assist modal / canvas / ONNX
- ไม่เปลี่ยน data model / DB schema
- ไม่ override `--ion-color-primary-contrast` หรือ `--color-text-inverse` (จะกระทบปุ่ม primary ทั้งแอป + พัง AA dark)
- ไม่เพิ่ม field ใหม่ในฟอร์ม

## Doc Gaps Found
- **DS conflict (resolved in-plan):** คำขอ "text ปุ่มสีขาว" ขัดกับ DS decision ที่ dark-mode primary button ใช้ text สีเข้ม (teal-500 + white = 3.74:1 FAIL AA, DS-Tokens:220). แก้โดยเปลี่ยน save button ไปใช้ `--gradient-brand` (hero surface, white bold text, AA large ✓) — ดู Design Additions. ถ้า user ยืนยันอยากได้ flat primary + white จริง ต้อง `/ow-design` ปรับ token ก่อน (จะกระทบทั้งแอป — ไม่แนะนำ)

## Affected Files
- `src/app/add/add.page.ts` — เพิ่ม `onTripChange()`; เพิ่ม state `atBottom = true` + `onScroll(ev)` handler (คำนวณ boundary)
- `src/app/add/add.page.html` — trip select ผูก `(ionChange)="onTripChange()"`; `ion-content` เปิด `[scrollEvents]="true"` + `(ionScroll)="onScroll($event)"`; เพิ่ม `ion-fab` (save) แสดงเมื่อ `!atBottom`; inline `.submit-section` แสดงเมื่อ `atBottom`
- `src/app/add/add.page.scss` — style FAB + inline save ใช้ `--gradient-brand` bg + `--color-neutral-0` text (bold); transition เคารพ `prefers-reduced-motion`

## Implementation Steps
1. **onTripChange()** ใน add.page.ts: หา `trip = this.trips.find(t => t.id === this.draft.tripId)`; ถ้า `trip?.vehicleId != null` → `this.draft.vehicleId = trip.vehicleId; this.onVehicleChange();`. ถ้าเลือก "ไม่ระบุ"/ทริปไม่มีรถ → ไม่แตะ `draft.vehicleId` (เคารพ manual pick).
2. **Wire trip select**: add.page.html trip `ion-select` เพิ่ม `(ionChange)="onTripChange()"` (ดู vehicle select เป็น pattern อ้างอิง).
3. **Scroll state**: add.page.ts เพิ่ม `atBottom = true;` และ `async onScroll(ev: CustomEvent)` — อ่าน `ev.detail.scrollTop` + query `scrollElement` (`getScrollElement()`) เทียบ `scrollTop + clientHeight >= scrollHeight - THRESHOLD` (THRESHOLD ~24px). set `atBottom` เฉพาะเมื่อค่าเปลี่ยน (กัน re-render ถี่).
4. **Enable scrollEvents**: `ion-content` เพิ่ม `[scrollEvents]="true"` + `(ionScroll)="onScroll($event)"`. init `atBottom` = true (form สั้นกว่า viewport → ไม่โผล่ FAB โดยไม่จำเป็น; ตั้ง recompute ครั้งแรกใน `ionViewDidEnter`/หลัง picker load).
5. **FAB save**: add.page.html เพิ่ม `<ion-fab vertical="bottom" horizontal="end" slot="fixed" *ngIf="!atBottom">` → `<ion-fab-button (click)="save(entryForm)" [disabled]="isSaving">` (icon checkmark + spinner ตอน saving). อยู่นอก/ในฟอร์มก็ได้ ตราบใดที่เข้าถึง `entryForm` (ใช้ template ref เดียวกัน).
6. **Toggle inline**: `.submit-section` ครอบด้วย `*ngIf="atBottom"` (หรือ class hidden) → เห็น inline เฉพาะตอนถึงล่าง.
7. **White text + gradient**: add.page.scss — FAB button + inline submit button ใช้ `background: var(--gradient-brand)` และ `--color: var(--color-neutral-0)` (หรือ `color:#fff` ผ่าน DS token `--color-neutral-0`), `font-weight: var(--weight-semibold)`. inline button เอา `color="primary"` ออก → ใช้ class hero gradient แทน.
8. **reduced-motion**: FAB/inline transition ใส่ `@media (prefers-reduced-motion: reduce){ transition:none }`.
9. รัน `bun lint` (coding rule) → capture `lint-output.txt` ก่อน mark done.

## Design System Compliance
- [x] ใช้ tokens จาก DS-Tokens เท่านั้น: `--gradient-brand`, `--color-neutral-0`, `--weight-semibold`, `--space-*`, `--radius-*` (verified via diff)
- [x] ไม่ override `--ion-color-primary-contrast` / `--color-text-inverse` (source-of-truth policy) (verified — no such override in diff)
- [x] FAB ใช้ pattern เดียวกับ tabs gradient FAB (DS-Tokens §4.2 การใช้ gradient-brand บน FAB)
- [x] WCAG AA: white bold text บน gradient-brand — light 4.66–4.99:1 (normal-AA borderline → ใช้ bold/large), dark 3.5:1 (AA large 3:1 ✓). ปุ่ม save ใช้ bold + ≥50px = large → PASS (contrast math; on-device confirm → /ow-test)

## Design Additions
- **Save button = brand-gradient hero button (white bold text)** — เดิม add-page ใช้ flat `color="primary"`. เพิ่มการใช้ gradient-brand บนปุ่ม action (FAB + inline) เพื่อได้ text ขาวแบบ AA-safe. หากต้องการ log เป็น DS component ใหม่ → เรียก `/ow-design` ก่อน `/ow-implement` (หรือถือเป็น local application ของ gradient-brand hero pattern ที่ DS อนุญาตอยู่แล้ว)

## Test Plan
- [x] TC-01: component — `trips=[{id:1,vehicleId:5,isActive:true}]`; set `draft.tripId=1` + trigger `onTripChange()` → `draft.vehicleId===5` และ fuel-type cascade ทำงาน (FAIL ก่อน fix)
- [x] TC-02: (regression) component — `draft.vehicleId=9` (manual); เลือกทริปไม่มี `vehicleId` → `draft.vehicleId===9` ไม่ถูกล้าง (+ TC-02b "ไม่ระบุ" empty tripId)
- [x] TC-03: component/e2e — mock scroll: `!atBottom` → FAB render + inline hidden; ถึงล่าง → inline render + FAB hidden (TC-03a/b/c + threshold edge)
- [x] TC-04: (regression) component — click save จาก FAB และ inline → `save()` ถูกเรียก, invalid form → error path, valid → addEntry + resetForm
- [ ] Manual: darkmode + lightmode → ปุ่ม save text ขาวอ่านออกทั้งสอง theme; scroll กลางฟอร์มเห็น FAB, ล่างสุดเห็นปุ่มเต็ม (pending /ow-test — needs device)
- [x] `bun lint` exit 0 (capture lint-output.txt)

## Success Criteria
- [x] TC-01..TC-04 PASS (unit/component) → 78/78 SUCCESS (test-output.txt)
- [ ] Manual dark+light: save text = white, อ่านออก (AA), FAB↔inline toggle ตาม scroll position → **pending /ow-test** (needs device/simulator)
- [x] `bun lint` exit 0 → lint-output.txt
- [x] `bun build` สำเร็จ (Angular build ไม่มี error) → build-output.txt (2436ms, EXIT=0)

## Verification
- map กลับ Success Criteria แต่ละข้อพร้อมผลจริง (เติมโดย /ow-implement + /ow-test)

### /ow-implement result (2026-07-06 09:56)
- TC-01..TC-04 → **PASS** (9 new specs, 78/78 total green — test-output.txt)
- `bun lint` → **PASS** exit 0 (lint-output.txt)
- `bun build` → **PASS** exit 0 (build-output.txt)
- Manual dark+light AA + FAB↔inline visual → **NOT VERIFIED** (no device in env; contrast pre-verified by math/DS-Tokens §4.4). → /ow-test manual UAT.

## Risks
- **AA regression (white on gradient dark)** → mitigation: บังคับ bold + ปุ่ม ≥50px (large text 3:1) + ไม่ override token กลาง; verify contrast manual dark
- **FAB บัง field ล่างสุด** → mitigation: FAB `slot="fixed"` bottom-end + form มี `padding-bottom: var(--space-16)` อยู่แล้ว; FAB หายตอน atBottom
- **`ionScroll` ยิงถี่** → mitigation: set `atBottom` เฉพาะตอน boundary crossing (guard เทียบค่าเก่า)
- **iOS momentum/rubber-band** → mitigation: THRESHOLD ~24px กันคลาดเคลื่อนตอน overscroll
- **form สั้นกว่า viewport** → `atBottom` init = true → ไม่โผล่ FAB โดยไม่จำเป็น

## Approval
- [x] Approved (set status: approved before /ow-implement)

## Implementation Result (2026-07-06 09:56 — /ow-implement, mobile agent)
- **Status: implemented, awaiting manual UAT** — NOT flipped to `done`: Manual dark+light AA + FAB↔inline visual UAT unverifiable in this env (no device) → open checkbox remains → /ow-test to confirm + flip `done` + close source fix-log.
- **Files changed (prod):** `src/app/add/add.page.ts` (+53), `add.page.html` (+28), `add.page.scss` (+65)
- **Files changed (test):** `src/app/add/add.page.spec.ts` (+223 / 9 specs, TC-01..TC-04)
- **Tests added:** TC-01 trip→vehicle+fuel cascade · TC-02/02b regression manual-vehicle-preserved · TC-03a/b/c+ionViewDidEnter scroll boundary · TC-04×2 save wiring (invalid/valid)
- **DS tokens:** `--gradient-brand`, `--color-neutral-0`, `--duration-fast`, `--easing-standard`. No `--ion-color-primary-contrast`/`--color-text-inverse` override.
- **Success criteria → evidence:** TC-01..04=PASS(78/78) · lint=PASS(exit0) · build=PASS(exit0) · manual UAT=pending(/ow-test)
- **Evidence:** `test-artifacts/2026-07-06/plan-2026-07-06-0930-add-page-trip-vehicle-autofill-fab-save/EVIDENCE.md` (+ BUILD-INFO.md, lint/build/test-output.txt — gitignored)
- **Subagent:** mobile · **Coverage audit:** PROD=3 TEST=1 → PASS · **Discipline:** every hunk traces to step, no out-of-scope churn
- **Next:** `/ow-test` (manual dark+light UAT → flip `status: done` → close source fix-log 2026-07-06-0920)
