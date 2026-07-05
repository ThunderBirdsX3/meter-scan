---
applies_to: [coding]
---
# coding conventions for THIS project

- **ทุกครั้งที่ `/ow-implement` เสร็จงาน (ก่อน mark `status: done`/`fixed`) ต้องรัน `bun lint`**
  เพื่อเช็ค error ทั้งหมด — capture output ลง `$EVIDENCE_DIR` (เช่น `lint-output.txt`)
  เหมือน build/test evidence อื่นๆ (Phase 5.0)
  - `bun lint` exit ≠ 0 → ถือเป็น **evidence gate ไม่ผ่าน** เหมือน build/test fail —
    ห้าม flip status จนกว่า lint จะผ่าน หรือ error ที่เหลือ justify ได้ (pre-existing,
    ไม่เกี่ยวกับ scope ของ task นี้ — ระบุ error list ที่ skip)
  - lint fail ที่เกิดจาก code ใน scope ของ task → แก้ก่อน mark done เสมอ

- **ห้ามใช้ `npm run xxx` เวลา implement/test — ใช้ `bun xxx` แทนเสมอ**
  เช่น `npm run test` → `bun test`, `npm run build` → `bun build` (script name ตรงกับใน `package.json`)
  ยกเว้น `npm install` (ยังใช้ npm ปกติสำหรับจัดการ dependency)
