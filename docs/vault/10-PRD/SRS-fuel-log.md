---
tags: [type/srs]
status: draft                 # draft | review | approved | superseded
version: 0.1.0
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
  - image_uri (ถ้ามี) = path ชั่วคราว ไม่ copy ลง storage (อาจหายภายหลัง)
- **Acceptance** (Given/When/Then):
  1. **Given** แอปเปิดครั้งแรกไม่มีข้อมูล, **When** ผู้ใช้กรอก liters=30, price=35, amount=1050, brand=PTT, type=แก๊สโซฮอล์ 95 แล้วบันทึก, **Then** entry ปรากฏใน list และยังอยู่หลังปิด/เปิดแอป
  2. **Given** ฟอร์มเปิดอยู่, **When** ผู้ใช้กรอก liters ติดลบ หรือเว้นทั้ง liters/price/amount, **Then** ระบบบล็อกการบันทึก + แสดง error "กรอกข้อมูลการเติมไม่ครบ"
  3. **Given** เลือก brand=PTT, **When** เปิด dropdown ประเภทน้ำมัน, **Then** เห็นเฉพาะ fuel type ของ PTT
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

### FR-004 — Trip CRUD + ผูก entry

- **Priority**: P2
- **Source user story**: US4
- **Description**: ระบบต้องให้ผู้ใช้ เพิ่ม/แก้/ลบ ทริป (ชื่อ, รถ optional, วันที่เริ่ม?, หมายเหตุ?) และผูก fuel entry หลายรายการเข้าทริป (1 trip : N entries) การสร้างทริปเป็น optional
- **Inputs**: trip: name (required), vehicle_id?, start_date?, note?; การผูก = set fuel_entry.trip_id
- **Outputs**: trip row; entry ที่ผูกแสดงใต้ทริป
- **Pre-conditions**: name ไม่ว่าง; ถ้าระบุรถในทริป → รถมีอยู่จริง
- **Post-conditions**: ลบทริป → entry ที่ผูก set trip_id = NULL (ไม่ลบ entry), confirm พร้อมจำนวน entry
- **Acceptance**:
  1. **Given** มีทริป "เชียงใหม่", **When** ผูก 3 entries เข้าทริป, **Then** overview รายทริปของ "เชียงใหม่" รวม 3 entries
  2. **Given** ทริปมี entry ผูกอยู่, **When** ลบทริปและยืนยัน, **Then** entries ยังอยู่ แต่ trip = ไม่ระบุ
  3. **Given** ฟอร์มทริประบุรถ A, **When** entry ที่ผูกระบุรถ B, **Then** อนุญาต (ทริปไม่บังคับรถเดียว) แต่ overview รายรถยังนับตามรถของ entry
- **Error handling**: name ว่าง → block; DB fail → toast
- **Dependencies**: FR-010, FR-003

---

### FR-005 — Brand & Fuel Type (master config — read-only)

- **Priority**: P1
- **Source user story**: US1
- **Description**: brand + ประเภทน้ำมันต่อแบรนด์ = **master config** ที่ shipped มากับแอป (ดู [[REF-Architecture]] §7). ผู้ใช้ **เลือกอย่างเดียว — เพิ่ม/แก้/ลบ ไม่ได้**. ตอนกรอก entry เลือก brand แล้ว dropdown ประเภทต้อง filter ตาม brand นั้น
- **Inputs**: brand_id (เลือก), fuel_type_id (เลือกจาก fuel_type ของ brand นั้น)
- **Outputs**: dropdown แบรนด์ (read-only list) + dropdown ประเภท (filtered by brand)
- **Pre-conditions**: config โหลด/seed สำเร็จ (FR-011)
- **Post-conditions**: ไม่มี user mutation; entry ผูก brand_id/fuel_type_id ผ่าน FK (config append-only ข้าม app version — row เดิมไม่ถูกลบ จึงไม่มี dangling)
- **Acceptance**:
  1. **Given** เปิดแอปครั้งแรก, **When** เปิด dropdown แบรนด์, **Then** เห็นชุดแบรนด์ไทย config (PTT, Bangchak, Shell, …)
  2. **Given** เลือกแบรนด์ Shell, **When** เปิด dropdown ประเภท, **Then** เห็นเฉพาะประเภทของ Shell
  3. **Given** หน้า entry, **When** หา UI เพิ่ม/แก้/ลบ brand, **Then** **ไม่มี** — เป็น read-only config
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
- **Post-conditions**: ค่าที่ยืนยันถูกบันทึกเหมือน FR-001; image_uri = path ชั่วคราว (ไม่ copy ลง storage — อาจหายภายหลัง, แสดง placeholder ถ้าโหลดไม่ได้)
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
- **Description**: ระบบต้องเก็บเลขไมล์ (odometer สะสม) ต่อ entry และคำนวณประสิทธิภาพ **rolling avg ต่อกลุ่ม** (รถ/เดือน/ทริป) ไม่ใช่ต่อ entry: `กม./ลิตร = (max(odometer) − min(odometer) ในกลุ่ม) ÷ Σ liters ของ entry ในกลุ่มที่นับระยะ`. นับเฉพาะกลุ่มที่มี entry มี odometer ≥ 2 จุด และ Σliters > 0
- **Inputs**: odometer_km ต่อ entry (optional), vehicle_id, liters, ขอบเขตกลุ่ม (จาก FR-008)
- **Outputs**: ค่า กม./ลิตร ระดับกลุ่ม (รถ/เดือน/ทริป) ในรายงาน (FR-008) — ไม่แสดงต่อ entry
- **Pre-conditions**: ในกลุ่มมี odometer ≥ 2 ค่า; ระยะ (maxOdo−minOdo) > 0; Σliters > 0
- **Post-conditions**: แก้/ลบ entry → recompute ค่ารวมของกลุ่มที่เกี่ยวข้อง
- **Acceptance**:
  1. **Given** รถ A: entry odo=10000 liters=40, entry odo=10400 liters=35, **When** ดู กม./ลิตร ของรถ A, **Then** = (10400−10000) ÷ (liters ที่นับระยะ) แบบ rolling = 400 ÷ 40 = 10.0 <!-- TODO: ยืนยันว่า Σliters นับ entry แรกหรือไม่ (full-tank convention) -->
  2. **Given** กลุ่มมี odometer < 2 จุด หรือ odometer ว่างหมด, **When** ดู กม./ลิตร, **Then** = "—" (ไม่คำนวณ ไม่ error)
  3. **Given** entry มี odometer < ค่าก่อนหน้าของรถเดียวกัน (กรอกผิด), **When** บันทึก, **Then** เตือน "เลขไมล์น้อยกว่าครั้งก่อน" + ไม่นับ entry นั้นในระยะ
- **Error handling**: Σliters=0 → ไม่คำนวณ; odometer ถอยหลัง → warn + skip entry นั้น
- **Dependencies**: FR-001, FR-002, FR-008

---

### FR-008 — Overview Reports (trip · เดือน · รถ)

- **Priority**: P1
- **Source user story**: US2
- **Description**: ระบบต้องสรุปแสดง 3 มุมมอง — ราย trip, ราย เดือน, ราย รถ — แต่ละกลุ่มแสดง: ยอดเงินรวม (฿), ปริมาณรวม (ลิตร), จำนวนครั้งเติม, กม./ลิตร เฉลี่ย
- **Inputs**: มุมมองที่เลือก (trip/month/vehicle), ช่วงข้อมูล
- **Outputs**: รายการกลุ่ม + ตัวเลขสรุปต่อกลุ่ม
- **Pre-conditions**: มี fuel entry อย่างน้อย 1 รายการ
- **Post-conditions**: ค่าตรงกับผลรวมของ entry ใน DB ณ ขณะนั้น
- **Acceptance**:
  1. **Given** entries 2 รายการเดือน มิ.ย. (1050 + 700) รถ A, **When** ดู overview ราย เดือน, **Then** มิ.ย. = ยอด 1750฿, ลิตรรวมถูก, จำนวน 2
  2. **Given** entries รถ A และ B, **When** ดู overview ราย รถ, **Then** แยกกลุ่ม A/B ถูกต้อง รวมไม่ปน
  3. **Given** entry ไม่ผูกทริป, **When** ดู overview ราย trip, **Then** จัดอยู่กลุ่ม "ไม่ระบุทริป"
  4. **Given** ไม่มีกลุ่มใดมี odometer ≥ 2 จุด, **When** ดู กม./ลิตร เฉลี่ย, **Then** แสดง "—" (rolling, FR-007)
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

### FR-020 — ~~Amount = Liters × Price Invariant~~ (REMOVED)

> **ตัดออก** (Clarify 2026-06-29 Q4: "ไม่เช็คเลย"). liters / price / amount = field อิสระ เก็บตามกรอก — ไม่มี auto-calc, ไม่มี validation ความสัมพันธ์, ไม่มี warning. ความหมายเชิงโดเมน Amount=Liters×Price ยังจริง แต่ระบบ **ไม่บังคับ**. ดู FR-001 Pre-conditions.

## 4. Non-functional Requirements (NFR-###)

### NFR-001 — Performance

- **Threshold**: หน้า overview (FR-008) คำนวณ+render ≤ 1,000 ms ที่ข้อมูล 1,000 fuel entries; การบันทึก entry ≤ 300 ms
- **Measurement**: in-app `performance.now()` timing บนอุปกรณ์จริง (mid-range Android)
- **Linked SC**: SC-002

### NFR-002 — Privacy / Security

- **Threshold**: 0 network call จากแอป (ตรวจ network inspector); ข้อมูลและรูปทั้งหมดอยู่ในเครื่องเท่านั้น; ไม่ขอ permission ที่ไม่จำเป็น (เฉพาะกล้อง/รูปภาพสำหรับสแกน)
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

- **Vehicle** (id, name, plate?, default_fuel_type_id?, created_at) — 1:N → FuelEntry, 1:N → Trip
- **Trip** (id, name, vehicle_id?, start_date?, note?, created_at) — 1:N → FuelEntry
- **FuelEntry** (id, datetime, vehicle_id?, trip_id?, brand_id?, fuel_type_id?, liters, price_per_liter, amount, odometer_km?, station?, note?, image_uri?, created_at) — N:1 → Vehicle/Trip/Brand/FuelType. liters/price/amount อิสระ (ไม่บังคับ invariant). image_uri = temp path. กม./ลิตร = **derived ระดับกลุ่ม** (ไม่เก็บใน row)
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

## 7. Error Catalog

| Code | When | Message (user-facing) | FR |
|---|---|---|---|
| VAL_ENTRY | liters/price/amount ไม่ครบหรือติดลบ | "กรอกข้อมูลการเติมไม่ครบ" | FR-001 |
| VAL_VEHICLE | ชื่อรถว่าง | "ใส่ชื่อรถ" | FR-003 |
| VAL_TRIP | ชื่อทริปว่าง | "ใส่ชื่อทริป" | FR-004 |
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
- **Q2 (Domain & Data) — image storage [SUPERSEDES 06-29 Q3]:** เก็บรูปยังไง? **A:** **save-to-gallery + เก็บ URI ลิงก์** (ถ่าย → บันทึกลงแกลเลอรีเครื่อง → เก็บ URI ใน row). **กลับคำจาก 06-29 Q3 (temp path)**. → 🔴 flag: แก้ Data Model §5 `image_uri` (temp path → gallery URI), FR-001/FR-006 เพิ่ม save-to-gallery step + permission (iOS photo-add / Android media); ยังคง placeholder ถ้าลิงก์หาย
- **Q3 (Terminology / UX) — แท็บกลาง:** ชื่อแท็บ primary action? **A:** **"เพิ่ม" / add (⊕)** (สอดคล้อง PRD US1 กรอกเอง=P1, สแกน=P2 assist — [[PRD-fuel-log]] §7). → flag: [[FLOW-app-navigation]] ใช้ชื่อนี้แล้ว; เลิก option "Scan"/"เติม"
- **Q4 (UX / NFR) — FR-008 visualization:** Overview แสดงผลแบบไหน (MVP)? **A:** **Summary cards + list** (ion-card ตัวเลขรวม + ion-list ย่อยตามกลุ่ม) — **ไม่ดึง chart lib ใน MVP** (รักษา SC-002 ≤1s @1000 entries; bundle เล็ก). กราฟ = [DEFERRED to Phase 2]. → flag: FR-008 เติม AC ระบุ cards+list; chart = backlog
