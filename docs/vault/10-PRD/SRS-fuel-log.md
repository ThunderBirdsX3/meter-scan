---
tags: [type/srs]
status: draft                 # draft | review | approved | superseded
version: 0.1.2
date: 2026-06-28
prd: "[[PRD-fuel-log]]"
related_features:
  - "[[FEAT-MeterScan]]"
related_functions:
  - "[[FN-FieldScan]]"
  - "[[FN-ScanResult]]"
  - "[[FN-RoiRect]]"
---

# SRS-fuel-log — Fuel Log

## 1. System Overview

แอป mobile (Ionic 8 + Angular 20 NgModule + Capacitor 8, iOS + Android) บันทึกการเติมน้ำมัน ไม่มีบัญชี เปิดใช้ได้ทันที ข้อมูลทุกอย่างเก็บใน **SQLite บนเครื่อง** ผ่าน `@capacitor-community/sqlite` ผู้ใช้จัดการรถ/ทริป/การเติม และดูภาพรวม ราย trip · เดือน · รถ ฟีเจอร์สแกนมิเตอร์ ([[FEAT-MeterScan]], CRNN ONNX on-device) เป็นตัวช่วยเติมเลขในฟอร์ม ไม่มี backend / network call ใดๆ

## 2. Scope

**In scope:**
- Local SQLite persistence (vehicle, trip, fuel_entry, brand, fuel_type)
- Vehicle CRUD (optional ต่อการใช้งาน)
- Trip CRUD เป็นกล่องรวม fuel entries (optional)
- Fuel entry CRUD: วันที่ ลิตร ราคา/ลิตร ยอดเงิน แบรนด์ ประเภทน้ำมัน เลขไมล์ รถ ทริป รูป
- Built-in master config brand + fuel type (ชุดแบรนด์ไทย) — read-only, user เลือกได้อย่างเดียว
- Meter scan assist: autofill Amount/Liters/Price → draft → user ยืนยัน
- Overview reports ราย trip · เดือน · รถ: ยอดเงินรวม, ปริมาณรวม, จำนวนครั้ง, กม./ลิตร

**Out of scope:**
- Auth / multi-user / cross-device
- Mechanical rolling-digit meter (สแกน 7-seg LCD เท่านั้น)

## 3. Functional Requirements (FR-###)

### FR-001 — Fuel Entry: Create (กรอกเอง)

- **Priority**: P1
- **Source user story**: US1 ([[PRD-fuel-log]])
- **Description**: ระบบต้องให้ผู้ใช้สร้าง fuel entry โดยกรอก: วันเวลา (default = ตอนนี้), ปริมาณ (liters), ราคา/ลิตร (price), ยอดเงิน (amount), แบรนด์, ประเภทน้ำมัน, เลขไมล์ (odometer, optional), รถ (optional), ทริป (optional), หมายเหตุ (optional), รูป (optional) แล้วบันทึกลง SQLite
- **Inputs**: liters (number ≥0), price (number ≥0), amount (number ≥0), odometer_km (number ≥0 หรือว่าง), brand_id, fuel_type_id, vehicle_id?, trip_id?, datetime, note?, image_uri?
- **Outputs**: fuel_entry row ใหม่ (มี id, created_at) + กลับไปหน้า list ที่เห็น entry ใหม่บนสุด
- **Pre-conditions**:
  - liters / price / amount = field **อิสระ** เก็บตามกรอก — ไม่ auto-calc ไม่ validate ความสัมพันธ์ (Amount=Liters×Price ไม่บังคับ; FR-020 ตัดทิ้ง). ต้องกรอกอย่างน้อย amount และห้ามติดลบ
  - brand_id / fuel_type_id เลือกจาก master config (FR-005); fuel_type ต้อง belong กับ brand ที่เลือก
- **Post-conditions**:
  - row persist ใน SQLite (อยู่หลัง restart)
  - ถ้ากรอก odometer → ใช้คำนวณ กม./ลิตร แบบ rolling ในรายงาน (FR-007)
  - image_uri (ถ้ามี) = **gallery URI** — รูปถูกบันทึกลงแกลเลอรีของเครื่องตอนถ่าย แล้วเก็บลิงก์ใน row (Clarify 2026-06-30 Q2; ต้องขอ permission บันทึกรูป); แสดง placeholder ถ้าลิงก์หาย
  - ~~บันทึกขณะมีทริป active (FR-004) → entry auto-tag trip_id เป็นทริปนั้น~~ — **[DEFERRED — 2026-07-05]** auto-tag ขึ้นกับ active-trip lifecycle เดิมที่ไม่เคย implement; `is_active` ถูก repurpose เป็น picker enable/disable แทน (plan [[2026-07-05-1935-trip-enable-disable]], ดู FR-004 §Deferred). ปัจจุบัน trip_id ผูกด้วยมือเท่านั้น (เลือกจาก picker ที่กรองทริป `is_active=true`)
- **Acceptance** (Given/When/Then):
  1. **Given** แอปเปิดครั้งแรกไม่มีข้อมูล, **When** ผู้ใช้กรอก liters=30, price=35, amount=1050, brand=PTT, type=แก๊สโซฮอล์ 95 แล้วบันทึก, **Then** entry ปรากฏใน list และยังอยู่หลังปิด/เปิดแอป
  2. **Given** ฟอร์มเปิดอยู่, **When** ผู้ใช้กรอก liters ติดลบ หรือเว้นทั้ง liters/price/amount, **Then** ระบบบล็อกการบันทึก + แสดง error "กรอกข้อมูลการเติมไม่ครบ"
  3. **Given** เลือก brand=PTT, **When** เปิด dropdown ประเภทน้ำมัน, **Then** เห็นเฉพาะ fuel type ของ PTT
  4. **Given** รถ "Civic" มี `default_fuel_type_id` ตั้งไว้ (เช่น B7), **When** ผู้ใช้เลือกรถ "Civic" ในหน้าเติมน้ำมัน โดยช่องประเภทน้ำมันยังว่างอยู่ (หรือยังเป็นค่าที่ auto-fill มาจากรถคันก่อนหน้า), **Then** ช่องประเภทน้ำมันถูกตั้งเป็น B7 โดยอัตโนมัติ — ช่องยังคงแก้ไขได้เสมอ (ไม่ force/disable) และค่าที่ผู้ใช้เลือกเองแล้วจะไม่ถูก auto-fill ทับ (policy: เติมเฉพาะตอนช่องว่างหรือเป็นค่า auto เดิม — ไม่เคยทับค่าที่ผู้ใช้เลือกเอง; เพิ่มโดยแผน [[2026-07-03-2208-vehicle-fuel-autofill]])
- **Error handling**: validation fail (amount ว่าง/ติดลบ) → inline error ใต้ field, ไม่เขียน DB; SQLite write fail → toast "บันทึกไม่สำเร็จ" + คงข้อมูลในฟอร์ม
- **Dependencies**: FR-010 (SQLite), FR-005 (brand/type config)

---

### FR-002 — Fuel Entry: Read / Update / Delete

- **Priority**: P1
- **Source user story**: US1
- **Description**: ระบบต้องให้ดูรายการ fuel entry (เรียงวันเวลาใหม่→เก่า), แก้ไขทุก field, และลบ entry (มี confirm)
- **Inputs**: entry_id; สำหรับ update = field ที่แก้
- **Outputs**: list ที่อัปเดต; entry ที่แก้/ลบ persist ใน SQLite
- **Pre-conditions**: entry มีอยู่จริง
- **Post-conditions**: update/delete สะท้อนใน overview (FR-008) ทันที; ลบแล้วถ้า entry นั้นเป็นตัวคำนวณ กม./ลิตร ของ entry ถัดไป → recompute
- **Acceptance**:
  1. **Given** มี entry อยู่, **When** แก้ liters แล้วบันทึก, **Then** ค่ารวมใน overview เปลี่ยนตาม
  2. **Given** กดลบ entry, **When** ยืนยันใน dialog, **Then** entry หายจาก list + DB; **When** กดยกเลิก, **Then** entry ยังอยู่
- **Error handling**: ลบ entry ที่ถูกลบไปแล้ว (race) → no-op + refresh list
- **Dependencies**: FR-010, FR-007, FR-008

---

### FR-003 — Vehicle CRUD

- **Priority**: P2
- **Source user story**: US3
- **Description**: ระบบต้องให้ผู้ใช้ เพิ่ม/แก้/ลบ รถ (ชื่อ, ทะเบียน?, ประเภทน้ำมันเริ่มต้น?) การเพิ่มรถเป็น optional — ใช้แอปได้แม้ไม่มีรถ
- **Inputs**: name (string, required), plate? (string), default_fuel_type_id? 
- **Outputs**: vehicle row; ใช้เลือกใน fuel entry + trip
- **Pre-conditions**: name ไม่ว่าง
- **Post-conditions**: ลบรถที่มี entry/trip ผูกอยู่ → entry/trip set vehicle_id = NULL (ไม่ลบ entry); ถาม confirm พร้อมแจ้งจำนวน entry ที่กระทบ
- **Acceptance**:
  1. **Given** ไม่มีรถ, **When** เพิ่มรถ "Civic", **Then** "Civic" เลือกได้ในฟอร์ม fuel entry
  2. **Given** รถ "Civic" มี 5 entries, **When** ลบ "Civic" และยืนยัน, **Then** 5 entries ยังอยู่แต่ vehicle = ไม่ระบุ
  3. **Given** ฟอร์มเพิ่มรถ, **When** เว้นชื่อว่าง, **Then** บล็อก + error "ใส่ชื่อรถ"
- **Error handling**: ชื่อซ้ำ → อนุญาต (ไม่ unique) แต่เตือน; DB fail → toast
- **Dependencies**: FR-010, FR-005

---

### FR-004 — Trip CRUD + ผูก entry + enable/disable ใน picker

- **Priority**: P2
- **Source user story**: US4
- **Description**: ระบบต้องให้ผู้ใช้ เพิ่ม/แก้/ลบ ทริป (ชื่อ, รถ optional, วันที่เริ่ม?, หมายเหตุ?) และผูก fuel entry หลายรายการเข้าทริป (1 trip : N entries) การสร้างทริปเป็น optional. **`is_active` (repurposed — plan [[2026-07-05-1935-trip-enable-disable]], 2026-07-05)**: ควบคุมว่าทริปนี้ **ปรากฏในตัวเลือก (picker) ของหน้าเติมน้ำมัน (add page) หรือไม่** — toggle เปิด/ปิดโดยตรงจากหน้า list ทริป (`ion-toggle` ต่อแถว), persist ทันที. ทริปใหม่ default `is_active = true` (enable). *(หมายเหตุ: นี่คือความหมายใหม่ของคอลัมน์ `is_active` เดิม — ไม่ใช่ active-trip lifecycle ที่เคย spec ไว้ใน Clarify 2026-06-30 Q1; lifecycle เดิมไม่เคย implement จริงและถูกย้ายไปเป็น backlog ดู §Deferred ด้านล่าง)*
- **Inputs**: trip: name (required), vehicle_id?, start_date?, note?; การผูกด้วยมือ = set `fuel_entry.trip_id` (เลือกจาก picker หน้าเติมน้ำมันที่กรองเฉพาะทริป `is_active = true`); เปิด/ปิดใช้งานทริป = toggle `is_active` จากหน้า list ทริปโดยตรง
- **Outputs**: trip row (มี `is_active`); entry ที่ผูกแสดงใต้ทริป; trip summary (รวม ฿, รวมลิตร, จำนวนครั้ง)
- **Pre-conditions**: name ไม่ว่าง; ถ้าระบุรถในทริป → รถมีอยู่จริง
- **Post-conditions**: ลบทริป → entry ที่ผูก set trip_id = NULL (ไม่ลบ entry), confirm พร้อมจำนวน entry; toggle `is_active = false` (disable) → ทริปหายจาก picker หน้าเติมน้ำมันสำหรับการเลือก entry ใหม่เท่านั้น — **ไม่กระทบ fuel_entry ที่ผูกทริปนี้อยู่ก่อนแล้ว** (entry เดิมยังผูกทริปนี้ครบ ไม่เปลี่ยน trip_id, ยังนับใน overview รายทริปตามปกติ); toggle กลับเป็น `true` → กลับมาปรากฏใน picker ทันที; ทริปไม่ถูกลบ ไม่ถูกซ่อนจากหน้า list ทริปเอง (เห็นทั้ง enable/disable ใน list เสมอ)
- **Acceptance**:
  1. **Given** มีทริป "เชียงใหม่", **When** ผูก 3 entries เข้าทริป (ด้วยมือ), **Then** overview รายทริปของ "เชียงใหม่" รวม 3 entries
  2. **Given** ทริปมี entry ผูกอยู่, **When** ลบทริปและยืนยัน, **Then** entries ยังอยู่ แต่ trip = ไม่ระบุ
  3. **Given** ฟอร์มทริประบุรถ A, **When** entry ที่ผูกระบุรถ B, **Then** อนุญาต (ทริปไม่บังคับรถเดียว) แต่ overview รายรถยังนับตามรถของ entry
  4. **Given** สร้างทริปใหม่, **When** บันทึก, **Then** `is_active = true` ทันที (default enable) และปรากฏในตัวเลือก picker หน้าเติมน้ำมัน
  5. **Given** ทริป "ขอนแก่น" มี `is_active = true`, **When** user toggle เป็น disable จากหน้า list ทริป, **Then** ทริปนี้หายจาก picker หน้าเติมน้ำมันทันที (แต่ยังอยู่ในหน้า list ทริปตามปกติ ไม่ถูกลบ)
  6. **Given** ทริป "ขอนแก่น" ถูก disable แล้วมี fuel_entry ผูกอยู่ก่อนหน้า 3 รายการ, **When** ดู entry เหล่านั้น (history/รายละเอียด) หรือ overview รายทริป, **Then** entry ยังผูกทริป "ขอนแก่น" ถูกต้องครบ ไม่หาย ไม่เปลี่ยน trip_id — มีผลแค่ "หายจาก picker สำหรับ entry ใหม่ในอนาคต"
- **Error handling**: name ว่าง → block (VAL_TRIP); DB fail → toast
- **Dependencies**: FR-010, FR-003, FR-001 (manual trip_id linking ตอนบันทึก; picker กรองเฉพาะ `is_active = true`)

#### Deferred (backlog) — Active-trip lifecycle (ยังไม่ implement)

> เดิม FR-004 (Clarify 2026-06-30 Q1) ตั้งใจให้ `is_active` หมายถึง **active-trip lifecycle**: มีทริป "active" ได้ **1 อันทั่วระบบ**, ผู้ใช้ "เริ่มทริป"/"จบทริป" ได้, entry ที่บันทึกขณะมีทริป active จะ **auto-tag `trip_id`** เป็นทริปนั้นอัตโนมัติ, แท็บ "เพิ่ม" แสดง banner ทริป active — **lifecycle นี้ไม่เคยถูก implement จริง** (ทริปทุกอันถูกสร้างเป็น `is_active = false` เสมอในโค้ดเดิม — dead column). Plan [[2026-07-05-1935-trip-enable-disable]] repurpose คอลัมน์ `is_active` เดิมนี้ไปเป็นความหมายใหม่ (enable/disable ใน picker, ดู FR-004 ด้านบน) แทน — ไม่ใช่การ implement lifecycle เดิม
>
> Acceptance/behavior เดิมที่เคยผูกกับ active-trip lifecycle (ย้ายมาเก็บไว้ที่นี่เป็น backlog record — **ไม่ใช่ requirement ที่ active อยู่ปัจจุบัน**):
> - เริ่มทริป (active) ได้เฉพาะเมื่อไม่มีทริป active อื่นอยู่ (มี active อยู่แล้ว → ต้องจบก่อน, error `TRIP_ACTIVE`)
> - entry ที่บันทึกขณะมีทริป active → auto-tag `trip_id` เป็นทริปนั้นโดยไม่ต้องเลือกเอง + แท็บ "เพิ่ม" แสดง banner ทริป active
> - จบทริป (ended) → `ended_at = now`, `end_odometer?`; trip summary แสดงระยะ = `end_odometer − start_odometer`; entry ใหม่หลังจบไม่ auto-tag ทริปนี้อีก
> - ลบทริปที่กำลัง active → block, ต้องจบก่อนถึงลบได้ (error `TRIP_ACTIVE_DEL`, Clarify 2026-07-02(b) Q3)
>
> **สถานะ**: deferred/backlog — ไม่อยู่ใน scope ของแผนปัจจุบัน. หากต้องการทำในอนาคต ต้องออกแบบใหม่ (คอลัมน์ `is_active` ถูก repurpose ไปเป็น picker enable/disable แล้ว — lifecycle ใหม่ต้องใช้คอลัมน์แยก เช่น `lifecycle_state`, ไม่ conflict กับ `is_active`)

---

### FR-005 — Brand & Fuel Type (master config — seed/picker source only, no dedicated UI)

- **Priority**: P1
- **Source user story**: US1
- **Description**: brand + ประเภทน้ำมันต่อแบรนด์ = **master config** ที่ shipped มากับแอป (ดู [[REF-Architecture]] §7). ผู้ใช้ **เลือกอย่างเดียว — เพิ่ม/แก้/ลบ ไม่ได้**. ตอนกรอก entry เลือก brand แล้ว dropdown ประเภทต้อง filter ตาม brand นั้น. **ไม่มีหน้าจัดการหรือหน้าดูรายการ (view/management UI) แยกต่างหากในแอปสำหรับ config ชุดนี้** — brand/fuel type เป็นเพียง seed/picker data source ที่ power dropdown ในฟอร์มเพิ่มรายการ (FR-001/FR-006) เท่านั้น (settings-cleanup: หน้า "แบรนด์และประเภทน้ำมัน" ใต้ Settings ถูกลบทิ้ง — ดู plan [[2026-07-05-1940-settings-cleanup]])
  - **Config lifecycle (soft-hide)** — เพิ่มโดย plan [[2026-07-02-2140-sqlite-persistence-seed]] (Doc Gap #5): data model รองรับ `deleted_at` ต่อแถว (brand + fuel_type) เป็น **config-lifecycle capability** (เช่น ปั๊มเลิกขายแบรนด์นั้นแล้ว) — **ไม่ใช่ user-facing delete feature**. เมื่อ set `deleted_at`: `getBrands()`/`getFuelTypes()` (ใช้เติม dropdown ให้ user เลือก) กรองแถวที่ถูกซ่อนออก (`WHERE deleted_at IS NULL`); ส่วน fuel_entry/vehicle ที่มีอยู่ก่อนแล้วซึ่งอ้างอิง brand/fuel_type ที่ถูกซ่อน ต้อง resolve ชื่อ/สีถูกต้องเสมอผ่าน unfiltered lookup (`getBrandById()`/`getFuelTypeById()`) เพื่อให้ history/รายละเอียดยังแสดงข้อมูลถูกต้อง — ไม่ใช่ hard-delete, ไม่มี dangling FK
- **Inputs**: brand_id (เลือก), fuel_type_id (เลือกจาก fuel_type ของ brand นั้น)
- **Outputs**: dropdown แบรนด์ (read-only list, ไม่รวมแถวที่ soft-hide) + dropdown ประเภท (filtered by brand, ไม่รวมแถวที่ soft-hide)
- **Pre-conditions**: config โหลด/seed สำเร็จ (FR-011)
- **Post-conditions**:
  - ไม่มี user mutation ผ่าน UI ใดๆ ในแอปนี้; entry ผูก brand_id/fuel_type_id ผ่าน FK (config append-only ข้าม app version — row เดิมไม่ถูกลบจริง จึงไม่มี dangling)
  - soft-hide (`deleted_at` set) เป็น config/data-layer capability เท่านั้น — ไม่มีปุ่ม/ฟอร์มใน UI ปัจจุบัน trigger การ set ค่านี้ (future/config-maintainer path); brand/fuel_type ที่ถูกซ่อนยัง resolve ถูกต้องผ่าน entry/vehicle ที่อ้างอิงอยู่ก่อนหน้า (ชื่อ/สีไม่หาย)
- **Acceptance**:
  1. **Given** เปิดแอปครั้งแรก, **When** เปิด dropdown แบรนด์, **Then** เห็นชุดแบรนด์ไทย config (PTT, Bangchak, Shell, …)
  2. **Given** เลือกแบรนด์ Shell, **When** เปิด dropdown ประเภท, **Then** เห็นเฉพาะประเภทของ Shell
  3. **Given** หน้า entry หรือหน้า Settings, **When** หา UI เพิ่ม/แก้/ลบ/ดูรายการ brand แยกต่างหาก, **Then** **ไม่มี** ทั้งคู่ — ไม่มีทั้ง management UI และ dedicated view page (soft-hide `deleted_at` = config/data-layer capability เท่านั้น ไม่มี UI trigger ในแอปนี้ — ไม่ใช่ฟีเจอร์ user-facing delete)
  4. **Given** brand ถูก set `deleted_at` (soft-hide, config-layer), **When** เปิด dropdown แบรนด์ (`getBrands()`), **Then** brand นั้น**ไม่ปรากฏ**ในตัวเลือก; **When** ดู entry เก่าที่เคยอ้างอิง brand นั้น (history/รายละเอียด), **Then** ชื่อ + สียังแสดงถูกต้อง (resolve ผ่าน `getBrandById()` แบบ unfiltered — เช่นเดียวกันสำหรับ fuel_type ผ่าน `getFuelTypeById()`)
- **Error handling**: config โหลดไม่ได้ → dropdown ว่าง + error (ดู FR-011 rollback)
- **Dependencies**: FR-010, FR-011

---

### FR-006 — Meter Scan Assist (autofill)

- **Priority**: P2
- **Source user story**: US5
- **Description**: จากฟอร์ม fuel entry ผู้ใช้เปิดสแกนมิเตอร์ → ถ่าย/เลือกรูป → [[FEAT-MeterScan]] อ่าน Amount/Liters/Price → เด้งค่าเป็น **draft** ลงฟอร์ม ผู้ใช้แก้/ยืนยันก่อนบันทึก (ค่าจากสแกนไม่ commit เอง)
- **Inputs**: รูปจากกล้อง/gallery
- **Outputs**: ค่า amount/liters/price (draft) ในฟอร์ม + ลิงก์รูปกับ entry
- **Pre-conditions**: โมเดล CRNN โหลดได้ (ดู [[SRS-meter-scan]])
- **Post-conditions**: ค่าที่ยืนยันถูกบันทึกเหมือน FR-001; image_uri = **gallery URI** (รูปสแกนบันทึกลงแกลเลอรี แล้วเก็บลิงก์; Clarify 2026-06-30 Q2 — เปลี่ยนจาก temp path; placeholder ถ้าโหลดไม่ได้)
- **Acceptance**:
  1. **Given** ฟอร์ม entry เปิดอยู่, **When** สแกนรูปมิเตอร์สำเร็จ, **Then** Amount/Liters/Price เด้งเข้าฟอร์มเป็น draft แก้ได้
  2. **Given** สแกนไม่เจอ field (คืน null), **When** กลับมาที่ฟอร์ม, **Then** ฟอร์มว่างให้กรอกเอง + ข้อความ "สแกนไม่สำเร็จ ลองใหม่หรือกรอกเอง"
  3. **Given** ค่าสแกนผิด, **When** user แก้ก่อนกดบันทึก, **Then** ค่าที่บันทึก = ค่าที่ user แก้ ไม่ใช่ค่าสแกน
- **Error handling**: scan/throw → fallback กรอกเอง (ดู Error Catalog [[SRS-meter-scan]])
- **Dependencies**: [[FEAT-MeterScan]], FR-001

---

### FR-007 — Odometer + คำนวณ กม./ลิตร (rolling)

- **Priority**: P2
- **Source user story**: US2
- **Description**: ระบบต้องเก็บเลขไมล์ (odometer สะสม) ต่อ entry และคำนวณประสิทธิภาพ **rolling avg ต่อกลุ่ม** (รถ/เดือน/ทริป) ไม่ใช่ต่อ entry: `กม./ลิตร = (max(odometer) − min(odometer) ในกลุ่ม) ÷ Σ liters ของ entry ในกลุ่มที่นับระยะ`. นับเฉพาะกลุ่มที่มี entry มี odometer ≥ 2 จุด และ Σliters > 0. **Σliters ของกลุ่ม = ผลรวม liters ของทุก entry ยกเว้น entry ที่มี odometer ต่ำสุด** (ใช้เป็น baseline เริ่มระยะ ไม่ใช่ค่าใช้จ่ายของระยะนั้น — tank-to-tank convention, Clarify 2026-07-02 Q4)
- **Inputs**: odometer_km ต่อ entry (optional), vehicle_id, liters, ขอบเขตกลุ่ม (จาก FR-008)
- **Outputs**: ค่า กม./ลิตร ระดับกลุ่ม (รถ/เดือน/ทริป) ในรายงาน (FR-008) — ไม่แสดงต่อ entry
- **Pre-conditions**: ในกลุ่มมี odometer ≥ 2 ค่า; ระยะ (maxOdo−minOdo) > 0; Σliters > 0
- **Post-conditions**: แก้/ลบ entry → recompute ค่ารวมของกลุ่มที่เกี่ยวข้อง
- **Acceptance**:
  1. **Given** รถ A: entry odo=10000 liters=40 (baseline, odometer ต่ำสุด), entry odo=10400 liters=35, **When** ดู กม./ลิตร ของรถ A, **Then** = (10400−10000) ÷ (liters ที่นับระยะ, ยกเว้น entry baseline) แบบ rolling = 400 ÷ 35 = 11.4
  2. **Given** กลุ่มมี odometer < 2 จุด หรือ odometer ว่างหมด, **When** ดู กม./ลิตร, **Then** = "—" (ไม่คำนวณ ไม่ error)
  3. **Given** entry มี odometer < ค่าก่อนหน้าของรถเดียวกัน (กรอกผิด), **When** บันทึก, **Then** เตือน "เลขไมล์น้อยกว่าครั้งก่อน" + ไม่นับ entry นั้นในระยะ
- **Error handling**: Σliters=0 → ไม่คำนวณ; odometer ถอยหลัง → warn + skip entry นั้น
- **Dependencies**: FR-001, FR-002, FR-008

---

### FR-008 — Overview Reports (trip · เดือน · รถ)

- **Priority**: P1
- **Source user story**: US2
- **Description**: ระบบต้องสรุปแสดง 3 มุมมอง — ราย trip, ราย เดือน, ราย รถ — แต่ละกลุ่มแสดง: ยอดเงินรวม (฿), ปริมาณรวม (ลิตร), จำนวนครั้งเติม, กม./ลิตร เฉลี่ย. **Presentation (Clarify 2026-06-30 Q4)**: MVP = summary cards (ตัวเลขรวม) + ion-list ย่อยตามกลุ่ม; เลือกมุมมองด้วย ion-segment. **ไม่ใช้ chart library ใน MVP** (รักษา NFR-001/SC-002 ≤1s @1000 entries, bundle เล็ก) — กราฟ bar/line = [DEFERRED to Phase 2, backlog]
- **Inputs**: มุมมองที่เลือก (trip/month/vehicle), ช่วงข้อมูล
- **Outputs**: รายการกลุ่ม + ตัวเลขสรุปต่อกลุ่ม
- **Pre-conditions**: มี fuel entry อย่างน้อย 1 รายการ
- **Post-conditions**: ค่าตรงกับผลรวมของ entry ใน DB ณ ขณะนั้น
- **Acceptance**:
  1. **Given** entries 2 รายการเดือน มิ.ย. (1050 + 700) รถ A, **When** ดู overview ราย เดือน, **Then** มิ.ย. = ยอด 1750฿, ลิตรรวมถูก, จำนวน 2
  2. **Given** entries รถ A และ B, **When** ดู overview ราย รถ, **Then** แยกกลุ่ม A/B ถูกต้อง รวมไม่ปน
  3. **Given** entry ไม่ผูกทริป, **When** ดู overview ราย trip, **Then** จัดอยู่กลุ่ม "ไม่ระบุทริป"
  4. **Given** ไม่มีกลุ่มใดมี odometer ≥ 2 จุด, **When** ดู กม./ลิตร เฉลี่ย, **Then** แสดง "—" (rolling, FR-007)
  5. **Given** มี entries, **When** เปิดแท็บภาพรวม, **Then** เห็น summary cards (฿ รวม/ลิตร/ครั้ง/กม.ต่อลิตร) + ion-list ราย กลุ่ม ตาม ion-segment ที่เลือก — ไม่มีกราฟใน MVP
- **Error handling**: ไม่มี entry → empty state "ยังไม่มีข้อมูลการเติม"
- **Dependencies**: FR-010, FR-007

---

### FR-010 — Local SQLite Persistence (cross-cutting)

- **Priority**: P1
- **Source user story**: US1 (รองรับทุก US)
- **Description**: ระบบต้องเก็บข้อมูลทั้งหมด (vehicle, trip, fuel_entry, brand, fuel_type) ใน SQLite บนเครื่องผ่าน `@capacitor-community/sqlite` ไม่มี network call; ข้อมูลคงอยู่ข้ามการปิด/เปิดแอปและ reboot
- **Inputs**: CRUD calls จาก FR ต่างๆ
- **Outputs**: durable rows; schema + migration versioned
- **Pre-conditions**: DB เปิด/สร้างสำเร็จตอน app start
- **Post-conditions**: ทุก write commit ก่อนตอบ UI ว่าสำเร็จ
- **Acceptance**:
  1. **Given** บันทึก N entries, **When** force-quit + เปิดใหม่, **Then** N entries ครบ (0% loss)
  2. **Given** อัป schema version ใหม่, **When** เปิดแอปที่มีข้อมูลเดิม, **Then** migration รันโดยไม่ทำข้อมูลเดิมหาย
- **Error handling**: DB init fail → หน้าจอ error + retry; write fail → ไม่รายงานว่าสำเร็จ
- **Dependencies**: Capacitor SQLite plugin (ดู [[REF-Architecture]])

---

### FR-011 — Seed Data Bootstrap (cross-cutting)

- **Priority**: P1
- **Source user story**: US1
- **Description**: ครั้งแรกที่เปิดแอป (DB ว่าง) ระบบต้อง load master config brand + ประเภทน้ำมัน (read-only, FR-005); idempotent (รันซ้ำไม่เพิ่มซ้ำ). config ใหม่ใน app version ถัดไป = append rows ใหม่ (ไม่ลบของเดิม กัน dangling FK)
- **Inputs**: config dataset (built-in, ดู [[REF-Architecture]] §7)
- **Outputs**: brand/fuel_type rows (config)
- **Pre-conditions**: DB schema พร้อม (FR-010)
- **Post-conditions**: config version กันการ seed ซ้ำ
- **Acceptance**:
  1. **Given** ติดตั้งใหม่, **When** เปิดแอปครั้งแรก, **Then** brand/type config ครบ
  2. **Given** seed แล้ว, **When** เปิดแอปครั้งถัดไป, **Then** ไม่ seed ซ้ำ (idempotent)
- **Error handling**: seed fail กลางคัน → rollback transaction, retry ครั้งหน้า
- **Dependencies**: FR-010

---

### FR-012 — Appearance / Theme (Dark Mode Toggle)

> เพิ่มโดย plan `[[2026-07-02-1526-settings-subpages-darkmode]]` (2026-07-02) หลังพบว่าไม่มี FR รองรับฟีเจอร์นี้ใน SRS — เติม priority/acceptance/dependencies ครบผ่าน `/ow-clarify` (Session 2026-07-02).

- **Priority**: P3 (Clarify 2026-07-02 Q1 — nice-to-have, ไม่ gate §12 Acceptance for Release)
- **Source**: plan `[[2026-07-02-1526-settings-subpages-darkmode]]` (ไม่มี user story ต้นทางใน [[PRD-fuel-log]])
- **Description**: toggle dark mode แบบ **2-state** (สว่าง/มืด, ไม่ทำ 3-state/system-auto — Clarify 2026-07-02 Q2) ในหน้า Settings — persist ค่าด้วย Capacitor Preferences (key `theme`), apply ตอน app start ก่อน render แรก. **Default ก่อน user ตั้งค่า**: ไม่มี key `theme` ใน Preferences → read `prefers-color-scheme` (OS) เป็นค่าเริ่มต้นแสดงผล ไม่เขียนลง Preferences จนกว่า user จะ toggle (Clarify 2026-07-02 Q3)
- **Pre-conditions**: ไม่มี key `theme` ใน Preferences (fresh install) → อ่าน `prefers-color-scheme` แทน
- **Post-conditions**: toggle เปลี่ยน class `ion-palette-dark` บน `document.documentElement` ทันที + persist key `theme` ('light'/'dark')
- **Acceptance**:
  1. **Given** ติดตั้งใหม่ ไม่มี key `theme`, **When** เปิดแอปครั้งแรก, **Then** แสดงผลตาม OS `prefers-color-scheme` — ไม่เขียน Preferences
  2. **Given** อยู่หน้า Settings, **When** แตะ toggle เป็นมืด, **Then** class `ion-palette-dark` ถูกใส่ + Preferences `theme=dark` persist ทันที
  3. **Given** ตั้งค่า `theme=dark` ไว้แล้ว, **When** force-quit + เปิดแอปใหม่, **Then** ธีมมืด apply ก่อน render แรก (ไม่ flash light)
- **Error handling**: Preferences read/write fail → fallback theme ปัจจุบันใน memory, ไม่ crash
- **Dependencies**: Capacitor Preferences plugin, `ThemeService` (`src/app/services/theme.service.ts`), `app.component.ts` init hook

---

### FR-020 — ~~Amount = Liters × Price Invariant~~ (REMOVED)

> **ตัดออก** (Clarify 2026-06-29 Q4: "ไม่เช็คเลย"). liters / price / amount = field อิสระ เก็บตามกรอก — ไม่มี auto-calc, ไม่มี validation ความสัมพันธ์, ไม่มี warning. ความหมายเชิงโดเมน Amount=Liters×Price ยังจริง แต่ระบบ **ไม่บังคับ**. ดู FR-001 Pre-conditions.

## 4. Non-functional Requirements (NFR-###)

### NFR-001 — Performance

- **Threshold**: หน้า overview (FR-008) คำนวณ+render ≤ 1,000 ms ที่ข้อมูล 1,000 fuel entries; การบันทึก entry ≤ 300 ms
- **Measurement**: in-app `performance.now()` timing บนอุปกรณ์จริง (mid-range Android)
- **Linked SC**: SC-002

### NFR-002 — Privacy / Security

- **Threshold**: 0 network call จากแอป (ตรวจ network inspector); ข้อมูลและรูปทั้งหมดอยู่ในเครื่องเท่านั้น; ไม่ขอ permission ที่ไม่จำเป็น — เฉพาะ กล้อง/อ่านรูปภาพ (สแกน) + บันทึกรูปลงแกลเลอรี (image_uri, FR-001/006: iOS NSPhotoLibraryAddUsageDescription / Android media)
- **Measurement**: `/ow-secure` pre-flight + manual network capture แบบ airplane-mode run
- **Linked SC**: SC-004

### NFR-003 — Reliability / Durability

- **Threshold**: 0% data loss ข้าม restart/force-quit/reboot; ทุก write เป็น transactional commit
- **Measurement**: restart test หลังบันทึก N รายการ (SC-003)

### NFR-004 — Offline

- **Threshold**: ทุก flow (CRUD, สแกน, overview) ทำงาน 100% offline
- **Measurement**: airplane-mode end-to-end run
- **Linked SC**: SC-004

### NFR-005 — Usability

- **Threshold**: บันทึกการเติม 1 ครั้ง (กรอกเอง) ≤ 30 วินาที; UI ภาษาไทย
- **Measurement**: usability run 5 คน, เวลาเฉลี่ย (SC-001)

### NFR-006 — Scan Accuracy (อ้าง [[SRS-meter-scan]])

- **Threshold**: Amount/Liters/Price exact-match ทุกหลักบน eval set
- **Measurement**: field-accuracy บน labeled eval set (ดู [[SRS-meter-scan]] §Clarifications)

## 5. Data Model

- **Vehicle** (id, name, plate?, default_fuel_type_id?, vehicle_type?, created_at) — 1:N → FuelEntry, 1:N → Trip. `vehicle_type` = TEXT, nullable, enum 8 ค่า (Thai label — code): จยย (motorcycle), บิ๊กไบค์ (bigbike), สกู๊ตเตอร์ (scooter), เก๋ง (sedan), SUV (suv), PPV (ppv), ตู้ (van), บรรทุก (truck) — ใช้เลือกไอคอนแสดงในหน้ารถ (ขยาย FR-003, ไม่ใช่ FR ใหม่); `null` = ไม่แสดงไอคอน. รายละเอียด DDL/migration → [[REF-Architecture]] §3
- **Trip** (id, name, vehicle_id?, start_date?, note?, is_active, ended_at?, start_odometer?, end_odometer?, created_at) — 1:N → FuelEntry. `is_active` = **ทริปถูกเปิดใช้งานในตัวเลือก picker หน้าเติมน้ำมัน** (default `true`; disable = ซ่อนจาก picker, ไม่ลบ — repurposed by plan [[2026-07-05-1935-trip-enable-disable]], 2026-07-05; ความหมายเดิม "active-trip lifecycle, 1 active ทั่วระบบ" ไม่เคย implement จริง → deferred/backlog ดู FR-004 §Deferred). `ended_at`/`start_odometer`/`end_odometer` = คอลัมน์เดิมจาก active-trip lifecycle ที่ยังไม่ implement (deferred, คงคอลัมน์ไว้ ไม่ลบ schema)
- **FuelEntry** (id, datetime, vehicle_id?, trip_id?, brand_id?, fuel_type_id?, liters, price_per_liter, amount, odometer_km?, station?, note?, image_uri?, created_at) — N:1 → Vehicle/Trip/Brand/FuelType. liters/price/amount อิสระ (ไม่บังคับ invariant). image_uri = **gallery URI** (รูปบันทึกลงแกลเลอรีเครื่อง แล้วเก็บลิงก์; Clarify 2026-06-30 Q2 — เปลี่ยนจาก temp path; แสดง placeholder ถ้าลิงก์หาย). กม./ลิตร = **derived ระดับกลุ่ม** (ไม่เก็บใน row)
- **Brand** (id, name, created_at) — **master config, read-only** (ไม่มี user create/edit); 1:N → FuelType
- **FuelType** (id, brand_id, name, grade?, created_at) — **master config, read-only**; N:1 → Brand

รายละเอียด schema + config dataset → [[REF-Architecture]] §3, §7

## 6. State & Lifecycle

### FuelEntry states

| From | Event / Actor | To | Side effects |
|---|---|---|---|
| (none) | user สร้าง (FR-001) | saved | row insert; invalidate รายงาน กม./ลิตร ของกลุ่มที่เกี่ยว (rolling) |
| (none) | สแกน (FR-006) | draft (in-form) | autofill amount/liters/price; ยังไม่ commit |
| draft | user ยืนยัน | saved | เหมือน FR-001 |
| draft | user ยกเลิก | discarded | ไม่เขียน DB |
| saved | user แก้ (FR-002) | saved | row update; recompute รายงานกลุ่มที่เกี่ยว |
| saved | user ลบ (FR-002) | deleted | row delete; recompute รายงานกลุ่มที่เกี่ยว |

### Trip / Vehicle delete

| From | Event | To | Side effects |
|---|---|---|---|
| exists | ลบ vehicle (FR-003) | deleted | fuel_entry.vehicle_id / trip.vehicle_id → NULL (ไม่ลบ entry) |
| exists | ลบ trip (FR-004) | deleted | fuel_entry.trip_id → NULL |

### Trip enable/disable in picker (FR-004, repurposed by plan [[2026-07-05-1935-trip-enable-disable]], 2026-07-05)

| From | Event / Actor | To | Side effects |
|---|---|---|---|
| (none) | user สร้างทริปใหม่ | enabled (`is_active=true`) | trip insert; ปรากฏใน picker หน้าเติมน้ำมันทันที |
| enabled | user toggle disable (หน้า list ทริป) | disabled (`is_active=false`) | หายจาก picker หน้าเติมน้ำมันสำหรับ entry ใหม่; entry เดิมที่ผูกทริปนี้ไม่กระทบ (trip_id คงเดิม) |
| disabled | user toggle enable (หน้า list ทริป) | enabled (`is_active=true`) | กลับมาปรากฏใน picker ทันที |

### [DEFERRED/BACKLOG] Trip active lifecycle (FR-004, Clarify 2026-06-30 Q1 — superseded, ไม่ implement)

> **หมายเหตุ**: ตารางด้านล่างคือ active-trip lifecycle เดิมที่เคย spec ไว้ตาม Clarify 2026-06-30 Q1 — **ไม่เคย implement จริง** (ทริปทุกอันถูกสร้างเป็น `is_active=false` เสมอในโค้ดเดิม — dead column) และคอลัมน์ `is_active` ถูก repurpose ไปเป็นความหมายใหม่ "enable/disable ใน picker" แล้ว (ดูตารางด้านบน + FR-004 §Deferred). เก็บตารางนี้ไว้เพื่อรักษา decision trail — **ไม่ใช่ lifecycle ที่ active อยู่ปัจจุบัน**

| From | Event / Actor | To | Side effects |
|---|---|---|---|
| (none) | user เริ่มทริป (ไม่มี active อยู่) | active | trip insert is_active=true, ended_at=NULL, start_odometer? |
| (none) | user เริ่มทริป (มี active อยู่) | (blocked) | เตือน TRIP_ACTIVE — ไม่สร้าง |
| active | บันทึก entry (FR-001/006) | active | entry.trip_id = ทริป active อัตโนมัติ |
| active | user จบทริป | ended | is_active=false, ended_at=now, end_odometer?; entry ที่ผูกไว้คงอยู่ |
| ended | — | ended | entry ใหม่ไม่ auto-tag ทริปนี้ |

## 7. Error Catalog

| Code | When | Message (user-facing) | FR |
|---|---|---|---|
| VAL_ENTRY | liters/price/amount ไม่ครบหรือติดลบ | "กรอกข้อมูลการเติมไม่ครบ" | FR-001 |
| VAL_VEHICLE | ชื่อรถว่าง | "ใส่ชื่อรถ" | FR-003 |
| VAL_TRIP | ชื่อทริปว่าง | "ใส่ชื่อทริป" | FR-004 |
| TRIP_ACTIVE *(Deferred — active-trip lifecycle backlog, ยังไม่ implement; `is_active` repurposed เป็น picker enable/disable ดู FR-004 §Deferred)* | เริ่มทริปใหม่ขณะมีทริป active | "มีทริปที่ยังไม่จบ — จบก่อนเริ่มใหม่" | FR-004 |
| TRIP_ACTIVE_DEL *(Deferred — active-trip lifecycle backlog, ยังไม่ implement; decided in Clarify 2026-07-02(b) Q3 แต่ยังไม่เคยเพิ่มเข้าโค้ด/ตารางนี้จริงจนถึงตอนนี้ — ย้ายเข้า backlog พร้อม TRIP_ACTIVE)* | ลบทริปที่กำลัง active | "จบทริปก่อนลบ" | FR-004 |
| WARN_ODO | odometer ≤ ครั้งก่อนของรถเดียวกัน | "เลขไมล์น้อยกว่าครั้งก่อน" | FR-007 |
| SCAN_FAIL | สแกนคืน null/throw | "สแกนไม่สำเร็จ ลองใหม่หรือกรอกเอง" | FR-006 |
| DB_WRITE | SQLite write fail | "บันทึกไม่สำเร็จ" | FR-010 |
| DB_INIT | DB เปิดไม่ได้ตอน start | "เปิดฐานข้อมูลไม่สำเร็จ" + retry | FR-010 |

## 8. External Integrations

ไม่มี — แอป offline 100% ไม่มี network/external service. ใช้ on-device เท่านั้น: Capacitor Camera (สแกน), Capacitor SQLite (storage), onnxruntime-web (CRNN inference).

## 9. UX Flows

- "[[FLOW-app-navigation]]" — IA แม่: 4-tab structure (ภาพรวม·เพิ่ม·ประวัติ·ตั้งค่า) → FR mapping
- "[[FLOW-add-fuel-entry]]" <!-- TODO: สร้างด้วย /ow-flow -->
- "[[FLOW-overview-reports]]" <!-- TODO -->

## 10. Traceability

| FR | FN spec | Test plan | Status |
|---|---|---|---|
| FR-001 | [[FN-FuelEntry]] | [[TP-fuel-log]] | not-started |
| FR-002 | [[FN-FuelEntry]] | [[TP-fuel-log]] | not-started |
| FR-003 | [[FN-Vehicle]] | [[TP-fuel-log]] | not-started |
| FR-004 | [[FN-Trip]] | [[TP-fuel-log]] | not-started |
| FR-005 | [[FN-Brand]] · [[FN-FuelType]] | [[TP-fuel-log]] | not-started |
| FR-006 | [[FN-FieldScan]] · [[FEAT-MeterScan]] | [[TP-fuel-log]] | not-started |
| FR-007 | [[FN-FuelEntry]] | [[TP-fuel-log]] | not-started |
| FR-008 | [[FN-Overview]] | [[TP-fuel-log]] | not-started |
| FR-010 | [[FN-DbService]] | [[TP-fuel-log]] | not-started |
| FR-011 | [[FN-Seed]] | [[TP-fuel-log]] | not-started |
| FR-012 | — | — | **gap — stub only, needs `/ow-clarify`** (added post-hoc by plan `[[2026-07-02-1526-settings-subpages-darkmode]]`) |
| ~~FR-020~~ | — | — | removed (Clarify 2026-06-29) |

## 11. Dependencies (system-level)

- Capacitor 8 runtime (iOS + Android)
- `@capacitor-community/sqlite` (storage)
- `@capacitor/camera` + `@ionic/pwa-elements` (สแกน)
- onnxruntime-web (WASM) + `assets/models/crnn.onnx` (สแกน — ดู [[SRS-meter-scan]])

## 12. Acceptance for Release

- [ ] ทุก FR P1 (FR-001/002/005/008/010/011/020) implement + acceptance G/W/T pass (มี evidence)
- [ ] FR P2 (003/004/006/007) implement + pass
- [ ] NFR-001..005 ผ่าน threshold (มี evidence)
- [ ] SC-001..005 วัดผลได้
- [ ] `/ow-secure` ผ่าน (no network leak, no PII upload)
- [ ] `/ow-verify` ผ่าน

## 13. Clarifications

### Session 2026-06-28

- **Trip model:** Trip = กล่องรวมหลายครั้งเติม (1 trip : N fuel entries; entry ผูก trip optional)
- **Seed data:** ชุดแบรนด์ไทย built-in (ดู [[REF-Architecture]] §Seed); user เพิ่ม/แก้เองได้
- **Report metrics:** ยอดเงินรวม + ปริมาณรวม + จำนวนครั้ง + กม./ลิตร (entry มีช่อง odometer)
- **Non-goals:** Export, Cloud sync/backup, Reminder

### Session 2026-06-29

- **Q1 (Domain & Data) — brand/fuel type ownership:** ลบ brand/type ที่ entry อ้าง ทำยังไง? **A:** **brand/fuel type = master config** โหลดจาก config ของแอป — **user แก้ไม่ได้** (read-only). → 🔴 flag: **FR-005 เขียนใหม่** (ตัด user add/edit/delete; เหลือแค่ select + filter by brand); ลบ post-condition snapshot; DDL คง FK `brand_id`/`fuel_type_id` (config stable, append-only ข้าม version); PRD R2 (mitigation "ให้ user เพิ่มเอง") ขัด — ต้องแก้
- **Q2 (Domain) — efficiency formula:** กม./ลิตร per-entry full-tank หรือ rolling? **A:** **Rolling avg** (ระยะรวม ÷ ลิตรรวม ของรถ). → flag: **FR-007 แก้สูตร** (จาก per-entry `(odoΔ)/liters` → aggregate `Σdistance/Σliters`); FR-008 AC#4 + Data Model: กม./ลิตร เป็นค่าระดับกลุ่ม (รถ/เดือน/ทริป) ไม่ใช่ต่อ entry
- **Q3 (Edge / Data) — image storage:** เก็บรูปยังไง? **A:** **path ชั่วคราว** (ไม่ copy ลง app storage; URI อาจหาย). → flag: FR-001/FR-006 — `image_uri` optional + ไม่รับประกัน persist; UI แสดง placeholder ถ้าโหลดไม่ได้; ปิด PRD Open Q4
- **Q4 (FR-completeness) — amount invariant:** ถ้า amount ≠ liters×price ทำไง? **A:** **ไม่เช็คเลย** — เก็บ 3 ค่าตามกรอก. → 🔴 flag: **FR-020 ตัดทิ้ง** (ไม่มี invariant/auto-fill/warning); ลบ `WARN_AMOUNT` จาก Error Catalog §7; FR-001 pre-condition "liters+price หรือ amount" → เหลือแค่ required fields ตามจริง
- **Q5 (Completion) — seed list:** ยืนยันชุด seed 8 แบรนด์? **A:** **ใช้ draft ใน [[REF-Architecture]] §7 ไปก่อน** เป็น v1 config (แก้ภายหลังได้). → ปิด PRD Open Q2

### Session 2026-06-30

Trigger: ออกแบบ navigation/tabs ([[FLOW-app-navigation]]) → เจอ ambiguity ใหม่ + 1 reversal.

- **Q1 (Functional Scope / Domain) — active trip:** FR-004 รองรับ "เริ่มทริป/จบทริป" + auto-tag entry ไหม? **A:** **ใช่ — ขยาย FR-004**. มี active-trip ได้ **1 อันทั่วระบบ**; entry ที่ save ตอนทริป active → auto `trip_id`; banner ทริป active บนแท็บ "เพิ่ม" + ปุ่มจบ. → 🔴 flag: **FR-004 เพิ่ม acceptance active/end** + Trip data model `is_active`/`ended_at` (+ `start_odometer?`/`end_odometer?` ถ้าทำ trip distance); §6 State & Lifecycle เพิ่ม Trip active→ended; rule "1 active เท่านั้น" (เริ่มใหม่ตอนมี active → เตือนให้จบก่อน)
  > **[DEFERRED/SUPERSEDED — 2026-07-05]** Lifecycle นี้ไม่เคย implement จริง (dead column, ทริปทุกอันสร้างเป็น `is_active=false` เสมอ). Plan [[2026-07-05-1935-trip-enable-disable]] repurpose คอลัมน์ `is_active` เดิมไปเป็นความหมายใหม่ "enable/disable ใน picker หน้าเติมน้ำมัน" แทน (ดู FR-004). Active-trip lifecycle ตาม Q1 นี้ถูกย้ายไปเก็บเป็น **backlog** ใน FR-004 §Deferred + §6 [DEFERRED/BACKLOG] table — decision trail นี้ยังคงไว้ ไม่ลบ
- **Q2 (Domain & Data) — image storage [SUPERSEDES 06-29 Q3]:** เก็บรูปยังไง? **A:** **save-to-gallery + เก็บ URI ลิงก์** (ถ่าย → บันทึกลงแกลเลอรีเครื่อง → เก็บ URI ใน row). **กลับคำจาก 06-29 Q3 (temp path)**. → 🔴 flag: แก้ Data Model §5 `image_uri` (temp path → gallery URI), FR-001/FR-006 เพิ่ม save-to-gallery step + permission (iOS photo-add / Android media); ยังคง placeholder ถ้าลิงก์หาย
- **Q3 (Terminology / UX) — แท็บกลาง:** ชื่อแท็บ primary action? **A:** **"เพิ่ม" / add (⊕)** (สอดคล้อง PRD US1 กรอกเอง=P1, สแกน=P2 assist — [[PRD-fuel-log]] §7). → flag: [[FLOW-app-navigation]] ใช้ชื่อนี้แล้ว; เลิก option "Scan"/"เติม"
- **Q4 (UX / NFR) — FR-008 visualization:** Overview แสดงผลแบบไหน (MVP)? **A:** **Summary cards + list** (ion-card ตัวเลขรวม + ion-list ย่อยตามกลุ่ม) — **ไม่ดึง chart lib ใน MVP** (รักษา SC-002 ≤1s @1000 entries; bundle เล็ก). กราฟ = [DEFERRED to Phase 2]. → flag: FR-008 เติม AC ระบุ cards+list; chart = backlog

### Session 2026-07-02

Trigger: FR-012 stub (post-hoc จาก plan dark-mode) ไม่มี priority/acceptance; FR-007 AC#1 มี TODO ค้าง (formula ambiguity).

- **Q1 (Completion / FR-completeness) — FR-012 priority:** stub ยังไม่มี priority ยืนยัน **A:** **P3** (nice-to-have, ไม่ block release; ไม่ gate §12 Acceptance for Release) → flag: FR-012 เติม `Priority: P3`
- **Q2 (Functional Scope) — FR-012 theme mode:** รองรับ "follow system" (auto) ไหม? **A:** **2-state เท่านั้น** (สว่าง/มืด) — ไม่ทำ 3-state/system-auto → flag: FR-012 description คงเดิม (2-state), ตัด option 3-state ออกจาก scope
- **Q3 (Domain & Data) — FR-012 default ก่อน user ตั้งค่า:** key `theme` เริ่มต้นค่าไหนตอนเปิดแอปครั้งแรก? **A:** **ตามระบบ (OS system theme)** ณ ครั้งแรกที่ไม่มีค่าใน Preferences — หลัง user แตะ toggle แล้ว = ค่าที่ user เลือก persist ทับ (ไม่กลับไป auto อีก เพราะเป็น 2-state ไม่ใช่ 3-state) → flag: FR-012 เติม pre-condition "ไม่มี key `theme` ใน Preferences → read `prefers-color-scheme` เป็นค่าเริ่มต้นแสดงผล (ไม่เขียนลง Preferences จนกว่า user จะ toggle)"
- **Q4 (FR-completeness) — FR-007 Σliters ใน rolling formula:** นับลิตรของ entry แรก (min-odometer) ในกลุ่มด้วยไหม? AC#1 เดิม `400÷40=10.0` ขัดหลัก tank-to-tank. **A:** **Exclude entry แรก** (tank-to-tank / full-tank convention — ลิตรที่เติม "ปิดช่วง" ระยะทางคือลิตรของ fill ถัดไป ไม่ใช่ fill ตั้งต้น) → AC#1 แก้เป็น `400÷35=11.4` → 🔴 flag: **FR-007 แก้ AC#1** (40→35, ผล 10.0→11.4) + Description เติมนิยาม "Σliters ของกลุ่ม = ผลรวม liters ของทุก entry **ยกเว้น entry ที่มี odometer ต่ำสุด** (ใช้เป็น baseline เริ่มระยะ ไม่ใช่ค่าใช้จ่ายของระยะนั้น)"

### Session 2026-07-02 (b)

Trigger: re-scan SRS-fuel-log — 4 ambiguity ที่ 4 session ก่อนยังไม่ครอบคลุม (cross-vehicle metric, orphan-photo, delete-active-trip, future-date).

- **Q1 (Domain & Data / FR-completeness) — FR-007 km/L ในกลุ่มที่มีหลายคันรถ:** กลุ่ม เดือน/ทริป มี entry หลายคัน → `maxOdo−minOdo` คร่อมเลขไมล์คนละคัน = ไร้ความหมาย. **A:** **คำนวณต่อรถก่อนแล้ว aggregate** — แยก sub-group ตาม `vehicle_id`, คิด (maxOdo−minOdo)÷(Σliters ยกเว้น min-odo entry) ต่อรถ, แล้วรวมระดับกลุ่มเป็น `Σdistance ÷ Σliters(นับระยะ)` ข้ามรถ; entry ไม่ระบุรถ (`vehicle_id` NULL) → ข้าม (ไม่นับระยะ) → 🔴 flag: **FR-007 Description + AC** เพิ่ม rule per-vehicle sub-grouping สำหรับกลุ่ม เดือน/ทริป; FR-008 AC#4 อ้าง odometer ≥2 จุด **ต่อรถ**
- **Q2 (Edge / Privacy) — ลบ entry ที่มี image_uri (gallery):** รูปในแกลเลอรีจัดการยังไงตอนลบ row? **A:** **คงรูปไว้ในแกลเลอรี** — ลบเฉพาะ DB row (รูปเป็นของ user ใน gallery ของเครื่อง, ไม่แตะ = ไม่ต้องขอ delete-permission cross-app, สอดคล้อง NFR-002 "ไม่ขอ permission ที่ไม่จำเป็น") → flag: FR-002 Post-conditions ระบุ "ลบ entry ไม่ลบรูปในแกลเลอรี (อาจ orphan — by design)"; NFR-002 note
- **Q3 (Edge / State) — ลบ trip ที่กำลัง active:** เกิดอะไรกับสถานะ active? **A:** **บล็อกลบตอน active** — ต้อง "จบทริป" ก่อนถึงลบได้ (กัน orphan active-state; สอดคล้อง rule 1-active) → 🔴 flag: **FR-004** เพิ่ม pre-condition "ลบ trip ได้เฉพาะ ended/ไม่ active"; §7 Error Catalog เพิ่ม code ใหม่ (เช่น `TRIP_ACTIVE_DEL` — "จบทริปก่อนลบ"); §6 State & Lifecycle note; FR-004 acceptance เพิ่ม 1 scenario
  > **[DEFERRED/SUPERSEDED — 2026-07-05]** ขึ้นกับ active-trip lifecycle (Q1, Session 2026-06-30) ซึ่งไม่เคย implement — `is_active` ถูก repurpose เป็น picker enable/disable แทน (plan [[2026-07-05-1935-trip-enable-disable]]). `TRIP_ACTIVE_DEL` ถูกเพิ่มเข้า §7 Error Catalog เป็น **deferred/backlog entry** เท่านั้น (ยังไม่เคย implement จริง) — ดู FR-004 §Deferred
- **Q4 (Edge / Validation) — FR-001 datetime อนาคต:** อนุญาต datetime > now ไหม? **A:** **อนุญาต ไม่ validate** (สอดคล้องปรัชญา minimal-validation ของแอป — เหมือน liters/price/amount ที่ไม่ validate ความสัมพันธ์, FR-020 ตัดทิ้ง) → flag: FR-001 Pre-conditions ระบุ "datetime รับค่าใดก็ได้รวมอนาคต — ไม่ validate"; overview รายเดือนจัดกลุ่มตาม datetime ตามจริง (entry อนาคตไปอยู่เดือนอนาคต)

### Doc Gap fix — 2026-07-02 (plan [[2026-07-02-2140-sqlite-persistence-seed]] pre-step)

Trigger: plan เพิ่ม `deleted_at` soft-hide column ให้ brand/fuel_type (config-lifecycle capability สำหรับซ่อนแบรนด์ที่ปั๊มเลิกขาย) — ขัดกับ FR-005 AC#3 เดิม "ไม่มี UI เพิ่ม/แก้/ลบ brand" ที่เขียนไว้ตั้งแต่ Session 2026-06-29 Q1 (brand = read-only, ไม่มี user mutation). ไม่ใช่ ambiguity ที่ต้องถามผู้ใช้ — เป็นการต่อยอด data-layer capability ที่ยังคง constraint เดิมไว้ครบ (ไม่มี user-facing delete UI ใดๆ) จึงแก้ตรงใน FR-005 โดยไม่เปิด session ใหม่:

- **soft-hide ≠ user delete**: `deleted_at` เป็น config/data-layer capability เท่านั้น — ไม่มีปุ่ม/ฟอร์มใน UI ปัจจุบัน trigger ได้ (ยืนยัน AC#3 เดิมยังจริง). เมื่อ set แล้ว: picker (`getBrands()`/`getFuelTypes()`) กรองออก, แต่ entry/vehicle เดิมที่อ้างอิง row ที่ถูกซ่อนต้อง resolve ชื่อ/สีถูกต้องเสมอผ่าน unfiltered lookup (`getBrandById()`/`getFuelTypeById()`) → ปิด Doc Gap #5 (ดู plan §Doc Gaps Found)
