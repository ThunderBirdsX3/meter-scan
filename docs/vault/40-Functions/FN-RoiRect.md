---
tags: [type/function]
status: draft
source: reverse-engineered
date: 2026-06-28
reverse_engineered_from:
  - src/app/home/home.page.ts
  - src/app/services/meter-onnx.service.ts
---

# FN-RoiRect

Rectangle สำหรับ ROI / manual selection (type `Rect` / `roi`).

## Fields (เห็นจริงในโค้ด)

| Field | Type | หน่วย |
|-------|------|-------|
| `x` | number | px |
| `y` | number | px |
| `w` | number | px |
| `h` | number | px |

## Coordinate spaces (สำคัญ)
- **Display canvas px** — `sel` ตอน user drag บน canvas
- **Natural-image px** — `roi` ที่ส่งเข้า model; แปลงด้วย `scale = naturalWidth / cssWidth`
- แปลง: `roi = round(sel * scale)` — [home.page.ts:123-128](../../../src/app/home/home.page.ts#L123-L128)

## Validation ที่เห็น
- selection ใช้ได้เมื่อ `w > 8 && h > 8` (`onUp`)

<!-- TODO: confirm — default sel = x15% y35% w70% h10% (setDefaultSel) เป็นค่าที่ตั้งใจ? -->
