---
tags: [type/plan]
date: 2026-07-05 19:45
title: หน้าเติมน้ำมัน — จัดลำดับ field ใหม่ + ย้ายปุ่มสแกนขึ้นบน
status: done
completed_at: 2026-07-05 20:55
subagent_target: mobile
related_docs:
  - "[[SRS-fuel-log]]"
  - "[[PRD-fuel-log]]"
  - "[[DS-Components]]"
estimate_hours: 1.5
risk_level: low
---

# หน้าเติมน้ำมัน — จัดลำดับใหม่

> UAT feedback batch 4/4 (2026-07-05). อื่นๆ: [[2026-07-05-1930-vehicle-type-icons]], [[2026-07-05-1935-trip-enable-disable]], [[2026-07-05-1940-settings-cleanup]]

## Vault Context Read
- `[[SRS-fuel-log]]` — FR-001 (3 numeric fields อิสระ, กรอกอย่างน้อย 1), FR-007 (odometer), scan-assist
- Code ปัจจุบัน: `src/app/add/add.page.html` (ลำดับปัจจุบัน: datetime → รถ → ทริป → แบรนด์/ประเภท → 3 numeric[ลิตร,฿/ลิตร,฿รวม] → เลขไมล์ → สถานี → หมายเหตุ → ปุ่มสแกน(ล่าง) → submit), `add.page.ts` (datetime default = now ทำงานแล้วใน `ionViewWillEnter`)

## Task
จัดลำดับ section ในฟอร์มเติมน้ำมันใหม่ตาม UAT + ย้ายปุ่ม "สแกนช่วยกรอก" ขึ้นมาไว้ **ใต้ วันที่/เวลา** + สลับคอลัมน์ 3 ตัวเลขเป็น **฿รวม → ลิตร → ฿/ลิตร**.

**ลำดับใหม่:**
1. วันที่และเวลา (default = now — มีแล้ว ไม่แก้)
2. ปุ่มสแกนช่วยกรอก
3. ฿รวม — ลิตร — ฿/ลิตร (triple, สลับลำดับคอลัมน์)
4. เลขไมล์
5. ทริป
6. รถ
7. แบรนด์ — ประเภท
8. ชื่อสถานีบริการ
9. หมายเหตุ
10. ปุ่มบันทึก (ล่างสุด — คงเดิม)

## FR Coverage
- **FR-001** — ไม่เปลี่ยน logic (ยังกรอกอย่างน้อย 1 ใน 3); แค่ลำดับ + ตำแหน่งคอลัมน์
- **scan-assist** — ย้ายตำแหน่งปุ่มเท่านั้น, logic/modal เดิม

## Goals
- [x] เรียง section ตามลำดับใหม่ 1–10
- [x] ปุ่มสแกน (`.scan-assist-section`) ย้ายมาอยู่ใต้ datetime
- [x] triple numeric คอลัมน์เรียง ฿รวม, ลิตร, ฿/ลิตร (ปัจจุบัน ลิตร/฿ต่อลิตร/฿รวม)
- [x] validation + name attribute + error binding เดิมทั้งหมดคงอยู่ (แค่ย้าย DOM block)
- [x] datetime ยัง default now (ยืนยัน ไม่แตะ ts)

## Non-goals
- ไม่เปลี่ยน logic save / scan / autofill / brand-fuel filter
- ไม่เพิ่ม/ลบ field
- ไม่แตะ add.page.ts (ยกเว้นถ้า reorder ทำให้ต้องแก้ — คาดว่าไม่ต้อง, เป็น template-only)

## Affected Files
- `src/app/add/add.page.html` — ย้ายลำดับ block (cut/paste ทั้ง `<div class="form-section">` / `.form-row-triple` / `.scan-assist-section`):
  - ปัจจุบัน scan-assist อยู่ก่อน submit → ย้ายขึ้นหลัง datetime section
  - `.form-row-triple` สลับลำดับ 3 `.form-section--third`: total-amount ก่อน, liters, price-per-liter
  - vehicle picker (รถ) ย้ายลงหลัง trip picker (ทริป) — ปัจจุบันรถอยู่ก่อนทริป
  - เลขไมล์ (odometer) ย้ายขึ้นมาอยู่หลัง triple (ก่อนทริป)
  - brand/fuel-type pair ย้ายลงหลังรถ
- `src/app/add/add.page.scss` — ตรวจว่า reorder ไม่ทำ style พัง (`.form-row-triple`, `.form-row-pair` เป็น layout container — ย้ายทั้ง block ไม่กระทบ)

## Steps
1. Reorder blocks ใน add.page.html ตามลำดับ 1–10
2. สลับ 3 คอลัมน์ใน `.form-row-triple`
3. ตรวจ ngModel name / #ctrl reference / error div id ยังคู่กันถูก (ย้ายทั้งชุด, id ไม่ชน)
4. `npm run build` → `npx cap sync`
5. UAT: กรอกครบ save ได้, validation error โผล่ถูก field, scan-assist เปิด/apply ค่าเข้า field ถูก, datetime = now ตอนเปิด tab

## Risks
- **R1** ย้าย DOM แล้วลืม name/ctrl/error-id → validation เพี้ยน. ย้ายทั้ง `.form-section` block รวม error div ไปด้วยกันเสมอ
- **R2** `.form-row-pair` (brand/fuel) + `.form-row-triple` เป็น flex 2/3 คอลัมน์ — ต้องย้ายทั้ง wrapper ไม่ใช่แค่ item ข้างใน

## Test
- Manual: ลำดับตรง spec, save ทำงาน, validation ต่อ field ถูก, scan apply ค่าเข้า ฿รวม/ลิตร/฿ต่อลิตร ถูกช่อง

## Implementation Result
- Files changed (prod / test): `src/app/add/add.page.html` (117 ins / 117 del — balanced DOM reorder) / none
  - `add.page.ts` / `add.page.scss` **ไม่แตะ** (ts diff ใน working tree = งานคนละ task: trip enable/disable — ยืนยันแล้ว)
- Tests added: none — pure markup reorder (untestable reason #1); binding integrity ยืนยันด้วย AOT build + lint
- Success criteria → evidence map:
  - เรียง 1–10 → `add.page.html` diff (ผ่าน)
  - scan-assist ใต้ datetime → block #2 (ผ่าน)
  - triple ฿รวม/ลิตร/฿ต่อลิตร → column swap (ผ่าน)
  - validation/name/error binding คงอยู่ → `npm run build` AOT template check EXIT=0 + `bun lint` EXIT=0 (ผ่าน)
  - datetime default now → ts untouched (ผ่าน)
  - Manual UAT (device) → **ยังไม่ตรวจ** (ไม่มี emulator ใน env นี้)
- Evidence: `test-artifacts/2026-07-05/plan-2026-07-05-1945-add-page-reorder/EVIDENCE.md` (build/capsync/lint = EXIT=0, gitignored)
- Subagent used: mobile   · Time: ~12m
