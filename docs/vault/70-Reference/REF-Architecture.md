---
tags: [type/reference]
status: draft
version: 0.1.0
date: 2026-06-28
related_docs:
  - "[[PRD-fuel-log]]"
  - "[[SRS-fuel-log]]"
  - "[[REF-TechStack]]"
---

# REF-Architecture — Fuel Log

## 1. Tech Stack

ดู [[REF-TechStack]] (Ionic 8 + Angular 20 NgModule, Capacitor 8, iOS + Android). เพิ่มสำหรับ fuel-log:

- **Storage**: `@capacitor-community/sqlite` — on-device SQLite, no backend
- **Scan**: onnxruntime-web (WASM) + CRNN `assets/models/crnn.onnx` (ดู [[FEAT-MeterScan]])
- **Camera**: `@capacitor/camera` + `@ionic/pwa-elements`

## 2. Architecture

```mermaid
flowchart TD
  subgraph UI[Pages NgModule]
    Entry[FuelEntry page<br/>add/edit]
    Vehicles[Vehicles page]
    Trips[Trips page]
    Overview[Overview page<br/>trip/month/vehicle]
    Scan[Scan modal]
  end
  subgraph Svc[Services providedIn root]
    Db[DbService<br/>SQLite CRUD + migration]
    Seed[SeedService<br/>brand/type bootstrap]
    Onnx[MeterOnnxService<br/>CRNN inference]
    Cam[CameraService]
    Report[ReportService<br/>aggregate + กม./ลิตร]
  end
  subgraph Store[(SQLite on-device)]
    T[(vehicle / trip / fuel_entry<br/>brand / fuel_type)]
  end
  Entry --> Db
  Entry --> Scan --> Onnx
  Scan --> Cam
  Vehicles --> Db
  Trips --> Db
  Overview --> Report --> Db
  Db --> T
  Seed --> Db
```

No network boundary — ทุกอย่างใน webview + native plugin. Offline 100% (NFR-004).

## 3. Data Model / Schema (SQLite DDL — draft)

```sql
-- brand / fuel_type = master config, read-only (FR-005). loaded by FR-011, append-only ข้าม app version (ไม่ลบ row → ไม่มี dangling FK)
CREATE TABLE brand (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE fuel_type (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id INTEGER NOT NULL REFERENCES brand(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade TEXT,                         -- เช่น '95','91','E20','B7'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE vehicle (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  plate TEXT,
  default_fuel_type_id INTEGER REFERENCES fuel_type(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE trip (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  vehicle_id INTEGER REFERENCES vehicle(id) ON DELETE SET NULL,
  start_date TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE fuel_entry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  datetime TEXT NOT NULL,
  vehicle_id INTEGER REFERENCES vehicle(id) ON DELETE SET NULL,
  trip_id INTEGER REFERENCES trip(id) ON DELETE SET NULL,
  brand_id INTEGER REFERENCES brand(id) ON DELETE SET NULL,
  fuel_type_id INTEGER REFERENCES fuel_type(id) ON DELETE SET NULL,
  liters REAL NOT NULL,
  price_per_liter REAL NOT NULL,
  amount REAL NOT NULL,
  odometer_km REAL,
  station TEXT,
  note TEXT,
  image_uri TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_entry_vehicle_dt ON fuel_entry(vehicle_id, datetime);
CREATE INDEX idx_entry_trip ON fuel_entry(trip_id);
CREATE INDEX idx_entry_dt ON fuel_entry(datetime);
```

**Migration**: `user_version` PRAGMA เป็น schema version. `DbService` รัน migration ขั้นบันได (v0→v1 = create tables; future = ALTER). FR-010 AC#2.

**กม./ลิตร (FR-007, rolling)**: aggregate ต่อกลุ่ม (รถ/เดือน/ทริป) = `(max(odometer_km) − min(odometer_km) ในกลุ่ม) / Σ liters ที่นับระยะ`; นับเฉพาะกลุ่มที่มี odometer ≥ 2 จุด. ไม่เก็บค่าใน row — derived ตอน query รายงาน.

**ON DELETE policy**: vehicle/trip ลบ → fuel_entry SET NULL (entry ไม่หาย). brand/fuel_type = config read-only **ไม่มี user delete** (FR-005) → entry FK ปลอดภัย; fuel_type CASCADE จาก brand ใช้เฉพาะ migration ฝั่ง config เท่านั้น.

## 4. API Contracts

ไม่มี HTTP API — service-level เท่านั้น (TypeScript). สัญญาในระดับ FN spec: [[FN-DbService]], [[FN-Overview]], [[FN-Seed]] (สร้างตอน /ow-plan).

## 5. Auth

ไม่มี — no account, no login (PRD §5, SRS §2).

## 6. Deployment

- `npm run build` → `www/` → `npx cap sync` (จาก root) → `ionic cap build ios|android`
- SQLite plugin ต้อง `cap sync` หลังติดตั้ง; iOS อาจต้อง pod install (cap จัดการ)
- ดู [[REF-TechStack]] §native gotchas (camera permission, bundle id)

## 7. Seed Dataset (ชุดแบรนด์ไทย — draft, FR-011)

> draft — user ยืนยัน/แก้ได้ในแอป (FR-005). grade ในวงเล็บ.

| Brand | Fuel types (seed) |
|---|---|
| **PTT Station** | แก๊สโซฮอล์ 95 (95), แก๊สโซฮอล์ 91 (91), แก๊สโซฮอล์ E20 (E20), แก๊สโซฮอล์ E85 (E85), Super Power Gasohol 95 (95), ดีเซล B7 (B7), Hi Diesel S B20 (B20), Hi Diesel S พรีเมียม (B7) |
| **Bangchak** | แก๊สโซฮอล์ 95 (95), แก๊สโซฮอล์ 91 (91), แก๊สโซฮอล์ E20 (E20), แก๊สโซฮอล์ E85 (E85), Hi Premium 97 (97), ดีเซล B7 (B7), Hi Premium Diesel S (B7) |
| **Shell** | FuelSave แก๊สโซฮอล์ 95 (95), FuelSave แก๊สโซฮอล์ 91 (91), แก๊สโซฮอล์ E20 (E20), V-Power Gasohol 95 (95), FuelSave Diesel B7 (B7), V-Power Diesel (B7) |
| **Esso / Mobil** | Supreme แก๊สโซฮอล์ 95 (95), Supreme แก๊สโซฮอล์ 91 (91), แก๊สโซฮอล์ E20 (E20), Supreme+ Gasohol 95 (95), Supreme Diesel B7 (B7) |
| **Caltex** | Techron แก๊สโซฮอล์ 95 (95), Techron แก๊สโซฮอล์ 91 (91), แก๊สโซฮอล์ E20 (E20), แก๊สโซฮอล์ E85 (E85), Diesel B7 (B7), Power Diesel (B7) |
| **PT (พีที)** | แก๊สโซฮอล์ 95 (95), แก๊สโซฮอล์ 91 (91), แก๊สโซฮอล์ E20 (E20), แก๊สโซฮอล์ E85 (E85), ดีเซล B7 (B7), ดีเซล B20 (B20) |
| **Susco** | แก๊สโซฮอล์ 95 (95), แก๊สโซฮอล์ 91 (91), แก๊สโซฮอล์ E20 (E20), ดีเซล B7 (B7) |
| **อื่นๆ (Other)** | เบนซิน 95 (95), แก๊สโซฮอล์ 95 (95), แก๊สโซฮอล์ 91 (91), E20 (E20), E85 (E85), ดีเซล B7 (B7), ดีเซล B20 (B20), NGV (NGV), LPG (LPG) |

<!-- TODO: user ยืนยันรายการนี้ (PRD Open Q2) — แบรนด์/สูตรเปลี่ยนได้ตามตลาด -->
