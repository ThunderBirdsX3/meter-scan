---
tags: [type/phase]
status: planning
phase: 1
date: 2026-06-28
project: fuel-log
prd: "[[PRD-fuel-log]]"
srs: "[[SRS-fuel-log]]"
---

# PHASE-1-MVP — Fuel Log MVP

## Goal

ผู้ใช้เปิดแอป (ไม่มีบัญชี) บันทึกการเติมน้ำมัน กรอกเอง+สแกนช่วย จัดการรถ/ทริป และเห็นภาพรวม ราย trip · เดือน · รถ — ข้อมูลทั้งหมดอยู่ใน SQLite บนเครื่อง

## Scope (FR mapping)

| Feature group | FR | Priority |
|---|---|---|
| SQLite persistence + migration | FR-010 | P1 |
| Seed brand/fuel type | FR-011, FR-005 | P1 |
| Fuel entry CRUD | FR-001, FR-002 | P1 |
| Overview reports | FR-008 | P1 |
| Vehicle CRUD | FR-003 | P2 |
| Trip CRUD + ผูก entry | FR-004 | P2 |
| Odometer + กม./ลิตร | FR-007 | P2 |
| Meter scan assist (fold POC) | FR-006 | P2 |

## Suggested build order

1. **Data layer** — DbService (FR-010) + schema/migration + SeedService (FR-011) → [[REF-Architecture]] §3
2. **Brand/type pickers** (FR-005) — dropdown filtered by brand
3. **Fuel entry form** (FR-001, FR-002) — หัวใจ MVP. field อิสระ ไม่ auto-calc
4. **Overview** (FR-008) — aggregate service + 3 มุมมอง
5. **Vehicle + Trip** (FR-003, FR-004) — ผูกเข้า entry
6. **Odometer + กม./ลิตร** (FR-007)
7. **Scan assist** (FR-006) — เชื่อม [[FEAT-MeterScan]] เดิม → autofill draft

## Existing assets (POC reuse)

- [[FEAT-MeterScan]] — CRNN scan พร้อมใช้ (home.page.ts, meter-onnx.service.ts, camera.service.ts)
- ⚠️ home.page เดิมเป็น single scan page — Phase 1 ต้อง restructure เป็น multi-page (entry/vehicles/trips/overview) + ย้าย scan เป็น modal ที่เรียกจาก entry form

## Exit criteria

- [ ] FR P1 ทั้งหมด pass acceptance (SRS §3) + evidence
- [ ] NFR-001/002/003/004 pass (SRS §4)
- [ ] บันทึก→restart→ข้อมูลครบ (SC-003)
- [ ] offline end-to-end (SC-004)

## Next

- `/ow-clarify SRS fuel-log` — เคลียร์ Open Questions (snapshot vs FK, กม./ลิตร formula, tolerance) ก่อน plan
- `/ow-plan <feature>` — เริ่มที่ data layer (FR-010/011)
