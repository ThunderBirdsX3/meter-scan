---
tags: [type/fix-log]
date: 2026-07-03 22:33
title: Orphaned home/ module blocks karma (ng test) repo-wide
status: fixed
fixed_commit: pending
severity: P2
area: mobile
reported_by: self
related_plan: "[[2026-07-03-2240-delete-orphaned-home-module]]"
---

# Orphaned home/ module blocks karma (ng test) repo-wide

## Symptom
`ng test` (karma, Jasmine) ล้มตอน compile — **0 specs รันได้ทั้ง repo** รวมถึง spec ใหม่ของ [[2026-07-03-2208-vehicle-fuel-autofill]]. `npm run build` (prod) ผ่านปกติ — กระทบเฉพาะ test gate.

## Reproduction
1. `npm test -- --watch=false --browsers=ChromeHeadless`
2. Expected: specs รัน (add.page.spec.ts, vehicles.page.spec.ts ควรผ่าน)
3. Actual: `EXIT=1` — compile abort:
   - `src/app/home/home.page.ts:4:10 - error TS2305: Module '"../services/meter-onnx.service"' has no exported member 'FieldScan'.`
   - `src/app/home/home.page.ts:85:38 - error TS2339: Property 'autoReadAllFields' does not exist on type 'MeterOnnxService'.`

## Success Criteria
- [x] `ng test` compile ผ่าน + specs รันได้ (ไม่ abort) — TC-01: 32/32, EXIT=0
- [x] `npm run build` (prod) ยัง EXIT=0 — TC-02 regression: EXIT=0
- [x] แอปยังทำงาน: 4 tab (overview/add/history/settings) ครบ — build clean, 0 inbound home refs
- [x] Out of scope respected: `meter-onnx.service.ts` API untouched; ไม่สร้าง scan feature ใหม่

## Root Cause
`src/app/home/` = **dead code** ค้างจาก 4-tab restructure (commit `bda500e`). ตอน restructure ย้าย scan feature ไป `src/app/add/add.page.ts` (ใช้ `MeterOnnxService.readField()`) แต่ไม่ได้ลบ `home/` ทิ้ง.
- `home.page.ts` ยัง import `FieldScan` (type) + เรียก `onnx.autoReadAllFields()` — **ทั้งคู่ไม่มีแล้ว** ใน `meter-onnx.service.ts` (export แค่ `MeterOnnxService` + `readField()`).
- `home/` **orphaned**: ไม่มี lazy-load/route ที่ไหน (`app-routing` → `tabs`; `tabs-routing` = overview/add/history/settings; grep `home.module`/`home/home` นอก `home/` = ไม่มี) → prod build ไม่ compile มัน จึงผ่าน.
- แต่ `tsconfig.spec.json` blanket-includes `**/*.spec.ts` → `home.page.spec.ts` ดึง `home.page.ts` เข้า program → compile ทั้ง program พังก่อน spec ใดรัน.

## Vault Context Read
- [[2026-07-03-2208-vehicle-fuel-autofill]] — plan ที่ implement แล้วโดน blocker นี้ (unit specs รัน karma ไม่ได้)
- CLAUDE.md — architecture: `src/app/home/` เดิม = scan page (pre-fuel-log); ตอนนี้ scan ย้ายไป add/

## Before Evidence
Evidence folder: `test-artifacts/2026-07-03/fix-202607032233-orphaned-home-blocks-karma/` (gitignored)
- Before test output: `before-test-output.txt` — `ng test` EXIT=1 + 2× TS error (RED proof) ✅

## Fix Approach
ลบ orphaned dir `src/app/home/` ทั้งหมด (6 ไฟล์: home.page.ts/.html/.scss/.spec.ts, home.module.ts, home-routing.module.ts) — dead code, scan feature อยู่ที่ add.page แล้ว. ไม่แตะ `meter-onnx.service.ts`. หลังลบ → karma compile ผ่าน, specs รัน; prod build ยังผ่าน (ไม่เคย reference home).
> ทางเลือกรอง (ถ้าอยากเก็บ home ไว้ reference): exclude `src/app/home/**` ใน `tsconfig.spec.json` — **ไม่แนะนำ** (ปล่อย dead code ค้าง + broken). เลือก delete.

## Affected Files
- `src/app/home/home.page.ts` — DELETE (dead, broken API refs)
- `src/app/home/home.page.html` — DELETE
- `src/app/home/home.page.scss` — DELETE
- `src/app/home/home.page.spec.ts` — DELETE
- `src/app/home/home.module.ts` — DELETE
- `src/app/home/home-routing.module.ts` — DELETE

## Test Cases (พิสูจน์ red→green — `/ow-implement` จะรันตาม list นี้)
- [x] TC-01: `ng test --watch=false` — FAIL ก่อน (compile abort, 0 specs) → PASS หลัง (32/32, EXIT=0; add.page.spec + vehicles.page.spec เขียว). หมายเหตุ: add.page.spec ต้อง fix inline (เพิ่ม FormsModule ใน TestBed — NG0301 ngForm ที่ถูกบังไว้ตอน compile abort). Evidence: test-output.txt
- [x] TC-02: `npm run build` EXIT=0, 0 TS error; 4 tab ครบ. Evidence: build-output.txt

## Risk
- ต่ำ — ลบ dead code ที่ไม่มี inbound reference. Mitigation: grep ยืนยัน `home` orphaned แล้ว (ไม่มี route/module/import นอก dir). ถ้าอนาคตอยาก restore scan-standalone page → ดึงจาก git history (`2e23441` initial commit).

## Next
- [x] `/ow-plan fix:` → plan `[[2026-07-03-2240-delete-orphaned-home-module]]` (approved) → `/ow-implement` เสร็จ 2026-07-03 22:52
- [x] ปิด fix-log auto โดย `/ow-implement` (status: fixed + tick TC). `fixed_commit: pending` → `/ow-git` stamp sha จริงตอน commit
- Follow-up (แยก): add.page.spec.ts FormsModule fix แตะไฟล์ของ plan 2208 — commit คู่กับงานนี้หรือ fold เข้า 2208
