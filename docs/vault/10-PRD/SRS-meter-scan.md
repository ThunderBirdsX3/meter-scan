---
tags: [type/srs]
status: draft
source: reverse-engineered
version: 0.1.0
date: 2026-06-28
prd: "[[PRD-meter-scan]]"
related_features:
  - "[[FEAT-MeterScan]]"
related_functions:
  - "[[FN-FieldScan]]"
  - "[[FN-ScanResult]]"
  - "[[FN-RoiRect]]"
---

# SRS-meter-scan — Meter Scan

> reverse-engineered จากโค้ด — ทุก acceptance = `<TODO>`. โค้ดบอก "ทำอะไร" ไม่บอก "ถูกต้องคืออะไร".

## 1. System Overview

Mobile app (Ionic 8 + Angular 20 + Capacitor 8) ถ่ายรูปตู้จ่ายน้ำมันแล้วอ่านเลขมิเตอร์ LCD 7-segment ด้วย CRNN ONNX บนเครื่อง — offline ทั้งหมด ไม่มี backend. ไม่มี data store ถาวร (history เก็บใน memory เท่านั้น).

## 2. Scope

**In scope:**
- ถ่ายภาพ / เลือกจาก gallery
- Auto-detect 3 field (Amount/Liters/Price) + manual ROI fallback
- On-device CRNN inference + CTC decode → digit string
- Scan history (in-memory, ≤20)

**Out of scope:**
- Backend / cloud OCR / network sync
- Auth, multi-user
- History persistence ข้าม session <!-- TODO: confirm -->

## 3. Functional Requirements

### FR-1 — Capture / Pick Photo
- **Description:** ผู้ใช้ถ่ายรูป (`Camera.takePhoto`) หรือเลือกจาก gallery (`Camera.getLimitedLibraryPhotos`). ผ่าน `Capacitor.convertFileSrc` ก่อนวาดลง canvas (กัน canvas tainted).
- **Inputs:** การกดปุ่มกล้อง/gallery
- **Outputs:** image URL → canvas, reset state เดิม
- **Error handling:** catch → `error = 'Open photo failed'` หรือ message จริง
- **Dependencies:** Capacitor Camera, [[FN-ScanResult]]
- **Acceptance:** `<TODO: user ยืนยัน Given/When/Then>`

### FR-2 — Auto-Detect & Read 3 Fields
- **Description:** `autoReadAllFields()` สแกน sliding-window หา Amount (y0.05..0.85, early-exit score≥4), Liters (y1+0.13 ±0.04), Price (y2+0.12, x0.30 w0.45). คืน `null` ถ้า Field 1 < 2 digit.
- **Inputs:** `HTMLImageElement` (natural px)
- **Outputs:** `FieldScan[3]` หรือ `null` → fallback manual
- **Error handling:** throw → `error = 'Detection failed'` + manual mode
- **Dependencies:** CRNN session, [[FN-FieldScan]]
- **Acceptance:** `<TODO: ค่าที่ถูกคืออะไร? tolerance ความแม่น? Δy constants ใช้ได้กับตู้ทุกแบบ?>`

### FR-3 — Manual ROI Read
- **Description:** user drag box บน canvas (`onDown/onMove/onUp`, valid เมื่อ w>8 & h>8) → `read()` แปลง sel→roi (× scale) → `readField(roi)`.
- **Inputs:** pointer drag → `Rect` (display px)
- **Outputs:** `FieldScan{label:'Manual'}` + history entry
- **Error handling:** catch → `error = 'Read failed'`
- **Dependencies:** [[FN-RoiRect]], CRNN session
- **Acceptance:** `<TODO>`

### FR-4 — CRNN Inference + CTC Decode
- **Description:** `preprocess()` (grayscale→resize128×32→invert→percentile(5,99) stretch→gamma 2.4) → tensor [1,1,32,128] → session.run → `ctcGreedyDecode` (collapse repeats, drop blank idx0, charset `0123456789.`).
- **Inputs:** image source + optional roi
- **Outputs:** digit string
- **Error handling:** model load fail → surfaced ตอน first real use
- **Dependencies:** onnxruntime-web (WASM, numThreads=1), `assets/models/crnn.onnx`
- **Acceptance:** `<TODO: ความแม่นขั้นต่ำ? preprocess ต้อง match local-llm/src/utils.py exactly>`

### FR-5 — Scan History
- **Description:** ทุกผลอ่าน (auto/manual) `unshift` เข้า `history`, cap 20 (`pop` เก่าสุด).
- **Inputs:** FieldScan results
- **Outputs:** `history: ScanResult[]`
- **Error handling:** —
- **Dependencies:** [[FN-ScanResult]]
- **Acceptance:** `<TODO: persist ข้าม session? export?>`

## 4. State & Lifecycle

HomePage UI state (เห็นในโค้ด): `currentImage`, `autoDetecting`, `autoDetected`, `manualMode`, `isProcessing`, `hasSelection`, `error`.
Transition หลัก: idle → pick → autoDetecting → (autoDetected | manualMode) → read → result.
`<TODO: full state machine + invalid transitions>`

## 5. Error Catalog

| Code/Message (จากโค้ด) | จุดเกิด |
|------------------------|---------|
| `Open photo failed` | FR-1 pick |
| `Image load failed` | loadImage onerror |
| `Detection failed` | FR-2 autoDetect |
| `Read failed` | FR-3 read |
| (model load fail — silent ตอน warmUp) | FR-4 ensureSession |

## 6. Non-Functional Requirements

- **Performance:** `<TODO: max inference time/scan? auto-detect ทำ 5-27 inferences>`
- **Offline:** ต้องทำงาน 100% offline (เห็นในสถาปัตยกรรม) <!-- confirm as hard NFR -->
- **Accuracy:** `<TODO>`
- **Privacy:** `<TODO: ภาพไม่ออกจากเครื่อง — ยืนยันเป็น requirement>`

## 7. Traceability

| FR | FN | Source | Test plan |
|----|----|--------|-----------|
| FR-1 | [[FN-ScanResult]] | camera.service.ts | `<TODO>` |
| FR-2 | [[FN-FieldScan]] | meter-onnx.service.ts:88 | `<TODO>` |
| FR-3 | [[FN-RoiRect]] | home.page.ts:117 | `<TODO>` |
| FR-4 | [[FN-FieldScan]] | meter-onnx.service.ts:154 | `<TODO>` |
| FR-5 | [[FN-ScanResult]] | home.page.ts:91 | `<TODO>` |

## 8. Open Questions

1. **CLAUDE.md ↔ code mismatch:** CLAUDE.md ว่า auto-detect (classical CV) failed/deferred แต่ `autoReadAllFields()` (sliding-window CRNN) implement แล้ว. → อัปเดต CLAUDE.md? <!-- TODO -->
2. ความหมายธุรกิจ Amount/Liters/Price + ความสัมพันธ์ (Amount = Liters × Price?)
3. ความแม่นขั้นต่ำที่ยอมรับได้ต่อ field
4. History persist ข้าม session ไหม? export ได้ไหม?
5. Δy constants (0.13/0.12) ใช้ได้กับตู้จ่ายทุกยี่ห้อ/layout?
6. รองรับ mechanical rolling-digit meter ไหม (obs #1533 ว่า detector fail กับแบบนี้)? → **resolved (Q4): LCD only**
7. NFR threshold ทั้งหมด (perf, accuracy, privacy guarantee) → accuracy resolved (Q2); perf/privacy ยัง `<TODO>`

## Clarifications

### Session 2026-06-28

- **Q1 (Domain & Data):** Amount/Liters/Price สัมพันธ์กันยังไง? **A:** **Amount = Liters × Price** (Amount=บาท, Liters=ปริมาณ, Price=ราคา/ลิตร). → flag: FR-2 acceptance ใช้ cross-check `|Amount − Liters×Price| ≤ rounding` ได้; เพิ่ม invariant ใน [[FN-FieldScan]]
- **Q2 (NFR / FR-completeness):** ความแม่นขั้นต่ำต่อ field? **A:** **exact** — digit string ต้องตรง 100% ทุกตัว (ผิดแม้หลักเดียว = fail). → flag: FR-2/FR-4 acceptance = exact-match; ต้องมี labeled eval set วัด field-accuracy
- **Q3 (Functional Scope / Edge):** History persist ข้าม session? **A:** **persist ลงเครื่อง** (เช่น Preferences/SQLite). → 🔴 code gap: ปัจจุบัน in-memory; เป็น **FR ใหม่** + storage layer; SRS §2 "out of scope: history persistence" ต้องย้ายเข้า in-scope
- **Q4 (Functional Scope):** รองรับ mechanical rolling-digit? **A:** **ไม่** — 7-seg LCD เท่านั้น. → flag: เพิ่มใน §2 Out of scope; ปิด Open Q6
- **Q5 (Terminology / Completion):** CLAUDE.md ขัดโค้ดเรื่อง auto-detect? **A:** [DEFERRED] — ยังไม่ตัดสินว่า auto = ของจริง หรือ experimental. Open Q1 ยังเปิด
