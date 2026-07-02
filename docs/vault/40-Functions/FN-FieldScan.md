---
tags: [type/function]
status: draft
source: reverse-engineered
date: 2026-06-28
reverse_engineered_from:
  - src/app/services/meter-onnx.service.ts
---

# FN-FieldScan

โครงสร้างผลอ่านค่า 1 field จาก LCD meter (interface `FieldScan`).

## Fields (เห็นจริงในโค้ด)

| Field | Type | ความหมาย |
|-------|------|----------|
| `label` | string | ชื่อ field — `Amount` / `Liters` / `Price` (auto) หรือ `Manual` |
| `text` | string | digit string ที่ถอดได้ (CTC decode) — `—` ถ้าว่าง |
| `roi` | `{x,y,w,h}` | crop rect ใน **natural-image pixels** |

## ที่มา
- นิยาม: [meter-onnx.service.ts:16-20](../../../src/app/services/meter-onnx.service.ts#L16-L20)
- ผลิตโดย `readField()` และ `autoReadAllFields()`

<!-- TODO: confirm — text มี max length? validation รูปแบบเลข (จุดทศนิยม)? -->
