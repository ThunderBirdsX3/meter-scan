---
tags: [type/function]
status: draft
source: reverse-engineered
date: 2026-06-28
reverse_engineered_from:
  - src/app/home/home.page.ts
---

# FN-ScanResult

โครงสร้าง 1 รายการใน scan history (interface `ScanResult`).

## Fields (เห็นจริงในโค้ด)

| Field | Type | ความหมาย |
|-------|------|----------|
| `imageUrl` | string | URL ภาพ (จาก `Capacitor.convertFileSrc`) |
| `fields` | `FieldScan[]` | ผลอ่านทุก field — ดู [[FN-FieldScan]] |
| `timestamp` | Date | เวลาที่ scan |

## ที่มา
- นิยาม: [home.page.ts:6-10](../../../src/app/home/home.page.ts#L6-L10)
- history เก็บใน `HomePage.history`, cap = 20 รายการ (เก่าสุดถูก `pop()`)

<!-- TODO: confirm — history persist ข้าม session ไหม? (ตอนนี้ in-memory เท่านั้น) -->
