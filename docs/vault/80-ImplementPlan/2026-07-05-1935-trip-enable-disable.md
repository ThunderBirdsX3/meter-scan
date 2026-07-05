---
tags: [type/plan]
date: 2026-07-05 19:35
title: ทริป — toggle enable/disable ในหน้า list + กรอง picker ตอนเติมน้ำมัน
status: done
completed_at: 2026-07-05 20:55
subagent_target: mobile
related_docs:
  - "[[SRS-fuel-log]]"
  - "[[PRD-fuel-log]]"
  - "[[DS-Components]]"
estimate_hours: 2
risk_level: low
---

# ทริป — enable/disable toggle

> UAT feedback batch 2/4 (2026-07-05). อื่นๆ: [[2026-07-05-1930-vehicle-type-icons]], [[2026-07-05-1940-settings-cleanup]], [[2026-07-05-1945-add-page-reorder]]

## Vault Context Read
- `[[SRS-fuel-log]]` — FR-004 (Trip CRUD + active-trip lifecycle, Clarify 2026-06-30 Q1)
- Code ปัจจุบัน: `src/app/settings/trips/trips.page.{ts,html}`, `src/app/models/fuel-entry.model.ts` (`Trip.isActive: boolean` มีอยู่แล้ว), `src/app/services/db.service.ts` (คอลัมน์ `trip.is_active` + updateTrip รองรับ `isActive` แล้ว), `src/app/add/add.page.{ts,html}` (trip picker แสดง trips ทั้งหมด)

## Task
ใช้ column `trip.is_active` ที่มีอยู่แล้ว (ปัจจุบัน dead — ทุกทริปสร้างเป็น false) มาเป็น **สวิตช์ enable/disable ต่อทริป** ควบคุมจาก **ion-toggle ในหน้า list ทริปโดยตรง**. หน้าเติมน้ำมัน (add) แสดงเฉพาะทริปที่ enable. ทริปที่สร้างใหม่ default = **enable**.

## FR Coverage
- **FR-004** — reinterpret `is_active` จาก "active-trip auto-tag lifecycle" (ยังไม่ทำ) → **"enable ในตัวเลือกตอนเติม"**. เป็นความหมายที่ user ต้องการจริง; ต้อง sync SRS (ดู Doc Gaps)

## Goals
- [x] หน้า list ทริป: แต่ละ row มี `ion-toggle` (slot="end") ผูก `t.isActive` → toggle เรียก `updateTrip(id,{isActive})` persist ทันที
- [x] ทริปใหม่ default `isActive: true` (แก้ `addTrip` ใน trips.page.ts จาก `false` → `true`)
- [x] add.page trip picker กรองเหลือเฉพาะ `isActive === true`
- [x] แก้ comment ใน model / trips.page.ts ที่บอก "new trips start inactive" ให้ตรงความหมายใหม่

## Non-goals
- ไม่ทำ active-trip start/end auto-tag (คนละเรื่อง; เดิม is_active ตั้งใจไว้ทำอันนี้ — ตอนนี้ repurpose)
- ไม่ลบทริปที่ disable; แค่ซ่อนจาก picker
- ไม่ย้าย toggle เข้า modal (user ขอ toggle ในหน้า list)

## Doc Gaps Found
- `[[SRS-fuel-log]]` FR-004 — ระบุความหมาย `is_active` = "enable สำหรับ picker" (ไม่ใช่ active-trip lifecycle). ต้อง update + note ว่า auto-tag lifecycle = backlog → `docs` subagent
- ทริปที่ disable แต่มี fuel_entry ผูกอยู่แล้ว → entry เดิมคงอยู่ (ไม่กระทบ). ระบุใน SRS ให้ชัด

## Affected Files
- `src/app/settings/trips/trips.page.html`:
  - เพิ่มใน `<ion-item>` แต่ละ row: `<ion-toggle slot="end" [checked]="t.isActive" (ionChange)="onToggle(t, $event)" [attr.aria-label]="'เปิดใช้งาน ' + t.name"></ion-toggle>`
  - ระวัง layout ชนกับ `.item-actions` (edit/delete buttons) — จัด toggle ก่อน buttons หรือปรับ flex
- `src/app/settings/trips/trips.page.ts`:
  - `addTrip` ใน `saveTrip`: `isActive: true` (จาก false)
  - method ใหม่ `async onToggle(t: Trip, ev: CustomEvent)`: `await this.data.updateTrip(t.id, { isActive: !!ev.detail.checked }); t.isActive = !!ev.detail.checked;`
  - อัปเดต comment เดิมที่อ้าง "FR-004 P2 auto-tag / new trips start inactive"
- `src/app/add/add.page.ts` — ใน `loadPickerData` หลัง `getTrips()`: `this.trips = trips.filter(t => t.isActive);`

## Steps
1. trips.page.html: เพิ่ม toggle + จัด layout กับ edit/delete
2. trips.page.ts: onToggle + default true + comment
3. add.page.ts: filter isActive
4. build + sync + UAT: toggle off ทริป → หายจาก add picker; ทริปใหม่ enable เลย

## Risks
- **R1** layout: `ion-toggle` + edit/delete ปุ่มใน slot="end" เดียวกันอาจแออัดบนจอแคบ. ทางแก้: toggle เป็น element แรกใน buttons group หรือย้าย edit/delete ไป sliding-only. ตรวจบน simulator จอเล็ก
- **R2** ทริปที่ user กำลังเลือกใน add form อยู่ แล้ว disable จากอีกหน้า → ครั้งหน้าเข้า add picker ไม่เห็น (แต่ entry ที่ save ไปแล้วไม่กระทบ). ยอมรับได้

## Test
- Manual: toggle persist ข้าม session (ปิดเปิดแอป), ทริป disable ไม่โผล่ใน add, ทริปใหม่ enable

## Implementation Result
- Files changed (prod / test): `trips.page.html`, `trips.page.ts`, `trips.page.scss`, `add.page.ts`, `fuel-entry.model.ts` (all prod; no test files — no automated Ionic component test harness in repo, untestable reason #5, plan §Test specifies manual UAT only)
- Vault docs updated: `SRS-fuel-log.md` — FR-004 redefined (`is_active` = add-page picker enable/disable), old active-trip lifecycle (Clarify 2026-06-30 Q1, Clarify 2026-07-02(b) Q3) preserved and annotated Deferred/backlog (not deleted)
- Success criteria → evidence map: 4/4 Goals done (see checkboxes above + diff); manual UAT not run this session — pending
- Evidence: `test-artifacts/2026-07-05/trip-enable-disable/EVIDENCE.md` (manifest — test-artifacts, gitignored)
- Subagent used: mobile (code) + docs (SRS sync)   · Time: ~2min build + ~2 subagent runs

