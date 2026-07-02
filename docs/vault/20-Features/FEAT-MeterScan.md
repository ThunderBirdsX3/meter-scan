---
tags: [type/feature]
status: draft
source: reverse-engineered
date: 2026-06-28
reverse_engineered_from:
  - src/app/home/home.page.ts
  - src/app/services/camera.service.ts
  - src/app/services/meter-onnx.service.ts
---

# FEAT-MeterScan

อ่านเลขมิเตอร์ตู้จ่ายน้ำมันจากรูปถ่าย ด้วย on-device OCR (CRNN ONNX) — ทำงาน offline เต็มรูปแบบ

## Scope (เห็นจริงในโค้ด)

แอป single-page (home). ไม่มี backend / network call — inference อยู่ใน webview ทั้งหมด.

### Flow
1. **เลือกภาพ** — กล้อง (`takePhoto`) หรือ gallery (`pickFromGallery`) → [[FN-ScanResult|camera.service]]
2. **Auto-detect** — `autoReadAllFields()` สแกนหา 3 field: `Amount` / `Liters` / `Price`
   - Field 1: sliding-window y=0.05..0.85, early-exit ที่ score≥4
   - Field 2: y ≈ y1+0.13 (±0.04)
   - Field 3: y ≈ y2+0.12, right-shifted (x0.30 w0.45)
   - คืน `null` ถ้า Field 1 < 2 digit → fallback manual mode
3. **Manual ROI** (fallback / user เลือกเอง) — drag box บน canvas → `read()` → `readField(roi)`
4. **แสดงผล + History** — เก็บใน `history` (in-memory, cap 20)

## Files ใน cluster
- [home.page.ts](../../../src/app/home/home.page.ts) — UI + ROI drag + history
- [camera.service.ts](../../../src/app/services/camera.service.ts) — Capacitor Camera wrapper
- [meter-onnx.service.ts](../../../src/app/services/meter-onnx.service.ts) — CRNN inference + preprocess + CTC decode

## Domain models
- [[FN-FieldScan]] · [[FN-ScanResult]] · [[FN-RoiRect]]

## API endpoints
ไม่มี — offline app.

## ⚠️ ไม่รู้ (ต้อง user เติม)
- **Business rules** — ความหมายธุรกิจของ Amount/Liters/Price, ความสัมพันธ์ (Amount = Liters × Price?) <!-- TODO -->
- **Acceptance criteria** — ดู [[SRS-meter-scan]] (ทุก FR = `<TODO>`)
- **Non-goals** <!-- TODO -->
- **History persistence** — ตอนนี้ in-memory; ต้องการ persist? <!-- TODO -->
