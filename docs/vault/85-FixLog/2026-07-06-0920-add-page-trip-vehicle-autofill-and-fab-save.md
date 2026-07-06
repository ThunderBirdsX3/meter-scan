---
tags: [type/fix-log]
date: 2026-07-06 09:20
title: Add page — trip→vehicle autofill missing + long-form save button hard to reach
status: in-progress
severity: P2
area: mobile
reported_by: user
related_plan: "[[2026-07-06-0930-add-page-trip-vehicle-autofill-fab-save]]"
---

# Add page — trip→vehicle autofill missing + long-form save button hard to reach

## Symptom
1. **Trip→vehicle autofill ไม่ทำงาน** — เลือกทริปที่ผูกรถไว้ (`Trip.vehicleId`) แล้ว ตัวเลือก "รถ"
   ไม่ถูกเลือกให้อัตโนมัติ ผู้ใช้ต้องเลือกรถซ้ำเองทุกครั้ง
2. **ปุ่มบันทึกเข้าถึงยาก** — form ยาว ต้อง scroll ลงสุดถึงจะเจอปุ่ม "บันทึก" (`.submit-section`)
   ตอนอยู่กลางฟอร์มไม่มีทางกดบันทึกได้

## Reproduction
1. เปิดหน้า "เพิ่มการเติมน้ำมัน"
2. เลือกทริปที่มี `vehicleId` (เช่นทริปที่สร้างพร้อมผูกรถใน Settings > Trips)
3. **Expected:** ช่อง "รถ" auto-select เป็นรถของทริปนั้น (แล้ว fuel-type autofill cascade ตาม)
   **Actual:** ช่อง "รถ" ว่างเปล่า ไม่เปลี่ยน
4. กรอกฟอร์ม แล้วสังเกตปุ่มบันทึก — ต้อง scroll สุดหน้าถึงจะเห็น (no sticky/FAB affordance)

## Success Criteria
- [ ] เลือกทริปที่มี `vehicleId` → `draft.vehicleId` ถูกตั้งอัตโนมัติ + fuel-type autofill cascade ทำงาน — verify via TC-01
- [ ] เลือกทริปที่ไม่มี `vehicleId` (หรือ "— ไม่ระบุ —") → ไม่ไปเขียนทับรถที่ผู้ใช้เลือกเองไว้ — verify via TC-02
- [ ] ยังไม่ scroll สุด → ปุ่มบันทึกแสดงเป็น FAB ลอย; scroll ถึงล่างสุด → กลับเป็นปุ่ม inline แบบเดิม — verify via TC-03
- [ ] Regression: การกด "บันทึก" (ทั้ง FAB และ inline) เรียก `save(form)` เดิม, validation/reset ยังทำงาน — verify via TC-04
- [ ] Out of scope: ไม่แตะ scan-assist modal, ไม่เปลี่ยน data model, ไม่เพิ่ม field ใหม่

## Root Cause
**Bug 1** — [add.page.html:151-161](../../../src/app/add/add.page.html#L151-L161): trip picker
`<ion-select name="tripId">` ไม่มี `(ionChange)` handler เลย, และ [add.page.ts](../../../src/app/add/add.page.ts)
ไม่มี method `onTripChange()`. `Trip` model มี field `vehicleId?` ([fuel-entry.model.ts:19](../../../src/app/models/fuel-entry.model.ts#L19))
แต่ไม่เคยถูกอ่านมาตั้ง `draft.vehicleId`. เทียบกับ vehicle picker ที่มี `(ionChange)="onVehicleChange()"`
([add.page.html:172](../../../src/app/add/add.page.html#L172)) → trip ขาด cascade นี้ทั้งเส้น.

**Bug 2** — [add.page.html:264-279](../../../src/app/add/add.page.html#L264-L279): ปุ่ม submit อยู่ใน
`.submit-section` เป็น flow content ท้าย `<form>` ใน`ion-content` ไม่มี sticky/FAB. ฟอร์มมี ~10 sections
(date, scan, 3 numeric, odo, trip, vehicle, brand+fuel, station, note) → ยาวเกิน viewport มือถือ ปุ่มจึงหลุดใต้ fold.
ไม่มี scroll-position state (`ion-content` ยังไม่เปิด `scrollEvents`).

## Vault Context Read
- Plan 2026-07-03-2208-vehicle-fuel-autofill (เส้น cascade vehicle→fuelType ที่ trip ควรต่อยอด)
- Plan 2026-07-05-1935-trip-enable-disable (trip picker กรองด้วย `isActive`)
- `fuel-entry.model.ts` — `Trip.vehicleId?` FK มีอยู่แล้ว ไม่ต้องแก้ schema
- ไม่พบ fix-log เก่าที่อาการซ้ำ

## Before Evidence
<!-- Evidence folder: test-artifacts/2026-07-06/fix-202607060920-add-page-trip-vehicle-autofill-and-fab-save/ (gitignored) -->
- Before screenshot: `pending evidence` — UI bug, ยังไม่มี emulator/device รันตอน diagnose;
  capture ตอน `/ow-implement` (before state: trip เลือกแล้วรถว่าง + ปุ่มบันทึกใต้ fold)
- Root cause ยืนยันจาก source: trip `ion-select` ไม่มี `(ionChange)`, ไม่มี `onTripChange()` ใน .ts,
  `.submit-section` ไม่มี sticky/FAB (grep/read ด้านล่าง)

## Fix Approach
1. **Bug 1** — เพิ่ม `onTripChange()` ใน [add.page.ts](../../../src/app/add/add.page.ts):
   หา trip จาก `draft.tripId`; ถ้า `trip.vehicleId != null` → ตั้ง `draft.vehicleId = trip.vehicleId`
   แล้วเรียก `onVehicleChange()` เพื่อ cascade fuel-type autofill. ผูก `(ionChange)="onTripChange()"`
   ที่ trip `ion-select`. เคารพ manual pick: เขียนทับรถเฉพาะเมื่อ trip มี vehicle (เลือก "ไม่ระบุ" ไม่ล้างรถ).
2. **Bug 2** — เปิด `[scrollEvents]="true"` + `(ionScroll)`/`ionScrollEnd` บน `ion-content`; track
   `atBottom: boolean` (เทียบ `scrollTop + clientHeight >= scrollHeight - threshold`). แสดง `ion-fab`
   (ปุ่มบันทึก mini) เมื่อ `!atBottom`, ซ่อน `.submit-section` inline; กลับกันเมื่อ `atBottom`.
   ทั้งสองปุ่มเรียก `save(entryForm)` ตัวเดียวกัน. เคารพ reduced-motion.

## Affected Files
- `src/app/add/add.page.ts` — เพิ่ม `onTripChange()`; เพิ่ม scroll state (`atBottom`) + `onScroll()` handler
- `src/app/add/add.page.html` — ผูก `(ionChange)="onTripChange()"` ที่ trip select; เปิด scrollEvents; เพิ่ม `ion-fab` save + toggle inline
- `src/app/add/add.page.scss` — style FAB save (ตาม DS token), transition ตาม reduced-motion

## Test Cases
- [ ] TC-01: unit/component — set `trips` มี trip `{id, vehicleId:V}`; เลือก trip → `draft.vehicleId === V` และ fuel-type cascade ทำงาน — FAIL ก่อน fix → PASS หลัง
- [ ] TC-02: (regression) unit — ผู้ใช้เลือกรถเอง แล้วเลือก trip ที่ไม่มี `vehicleId` → `draft.vehicleId` ไม่ถูกล้าง
- [ ] TC-03: component/e2e — scroll ยังไม่ถึงล่าง → FAB save visible + inline hidden; scroll ถึงล่าง → inline visible + FAB hidden
- [ ] TC-04: (regression) component — กด save จาก FAB และ inline → เรียก `save()` เดิม, validation error path + form reset ยังทำงาน

## Risk
- FAB อาจบัง field ล่างสุด → mitigate: FAB อยู่มุมล่าง + `.submit-section` มี padding พอ / ให้ FAB หายตอน atBottom
- `ionScroll` ยิงถี่ → throttle/เทียบเฉพาะ boundary crossing กัน re-render เกินจำเป็น
- iOS momentum scroll: `scrollHeight` ตอน rubber-band → ใช้ threshold กันคลาดเคลื่อน

## Next
- [ ] รัน `/ow-plan fix:add-page-trip-vehicle-autofill-and-fab-save` — สร้าง plan + ผูก link สองทาง
- [ ] รัน `/ow-implement <plan-path>` เพื่อแก้จริง (capture after-evidence + red→green)
- [ ] ปิด fix-log: auto โดย `/ow-implement` ตอน plan done
