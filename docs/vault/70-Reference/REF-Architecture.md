---
tags: [type/reference]
status: draft
version: 0.2.0
date: 2026-06-28
related_docs:
  - "[[PRD-fuel-log]]"
  - "[[SRS-fuel-log]]"
  - "[[REF-TechStack]]"
  - "[[2026-07-02-2140-sqlite-persistence-seed]]"
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
-- brand / fuel_type = master config, read-only for end-user (FR-005). loaded by FR-011, append-only ข้าม app version (ไม่ hard-delete row → ไม่มี dangling FK).
-- deleted_at = soft-hide (config-lifecycle capability, not a user-facing delete feature — see SRS FR-005 §Config lifecycle).
CREATE TABLE brand (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  logo_asset TEXT,                    -- bundled logo asset path, e.g. 'src/assets/brand-logos/ptt.png'; nullable — UI falls back to placeholder if missing
  deleted_at TEXT,                    -- soft-hide timestamp; NULL = visible. Set = hidden from getBrands() picker but still resolvable via getBrandById() (config-lifecycle, no end-user UI trigger)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE fuel_type (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id INTEGER NOT NULL REFERENCES brand(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade TEXT,                         -- เช่น '95','91','E20','B7'
  color TEXT,                         -- hex color string for this fuel type as sold by that brand (e.g. '#00A651'); nullable pending real reference data — see §7
  deleted_at TEXT,                    -- soft-hide timestamp; NULL = visible. Set = hidden from getFuelTypes() picker but still resolvable via getFuelTypeById() (config-lifecycle, no end-user UI trigger)
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
  is_active INTEGER NOT NULL DEFAULT 0,  -- 1 = the active trip (at most one active system-wide); 0 = never started / ended
  ended_at TEXT,                         -- timestamp trip was ended; NULL while active or never started
  start_odometer REAL,                   -- odometer at trip start (optional)
  end_odometer REAL,                     -- odometer at trip end (optional)
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

**id type note**: TS model `id` field (PK) และทุก FK reference field (`vehicle_id`, `trip_id`, `brand_id`, `fuel_type_id`, `default_fuel_type_id` ฯลฯ) ใน `src/app/models/fuel-entry.model.ts` เป็น `number` — สอดคล้องกับ DDL `INTEGER PRIMARY KEY AUTOINCREMENT` ข้างบน. เดิม TS model ใช้ `string` (ผูกกับ `uid()` stub ของ in-memory `FuelDataService`) ซึ่งไม่ตรงกับ DDL — เป็น TS-model bug ไม่ใช่การเปลี่ยน DDL semantics; ปิด doc/code type mismatch นี้ผ่าน plan [[2026-07-02-2140-sqlite-persistence-seed]].

**Migration**: `user_version` PRAGMA เป็น schema version. `DbService` รัน migration ขั้นบันได (v0→v1 = create tables ตาม DDL ด้านบน — รวม trip active-trip fields + brand/fuel_type master-data cols; future = ALTER). FR-010 AC#2.

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

> draft — grade ในวงเล็บแรก. Note: brand/fuel_type เป็น read-only ต่อ user (FR-005) — "ยืนยัน/แก้ได้ในแอป" ในบรรทัดนี้เดิมหมายถึง config maintainer ปรับ dataset ก่อน ship เวอร์ชันถัดไป ไม่ใช่ user-facing edit.
>
> **Logo asset**: path convention `src/assets/brand-logos/<brand-slug>.png` — ใส่ตาม convention นี้ทุกแบรนด์แม้ไฟล์จริงยังไม่มี (implementation ใช้ placeholder image fallback ถ้าไฟล์หาย — ดู plan [[2026-07-02-2140-sqlite-persistence-seed]] Risks)
>
> **Color**: hex สีจริงต่อแบรนด์ตามที่ปั๊มใช้จริงกับ fuel type นั้น — **ยังไม่มี reference ยืนยันในมือ** ดังนั้นทุกช่องด้านล่าง mark เป็น `TODO` (ห้ามเดาสี — ดู plan Risks §"fuel color reference"). รูปแบบช่อง fuel type = `name (grade, color)`.

| Brand | Logo asset | Fuel types (seed) — `name (grade, color)` |
|---|---|---|
| **PTT Station** | `src/assets/brand-logos/ptt.png` | แก๊สโซฮอล์ 95 (95, TODO), แก๊สโซฮอล์ 91 (91, TODO), แก๊สโซฮอล์ E20 (E20, TODO), แก๊สโซฮอล์ E85 (E85, TODO), Super Power Gasohol 95 (95, TODO), ดีเซล B7 (B7, TODO), Hi Diesel S B20 (B20, TODO), Hi Diesel S พรีเมียม (B7, TODO) |
| **Bangchak** | `src/assets/brand-logos/bangchak.png` | แก๊สโซฮอล์ 95 (95, TODO), แก๊สโซฮอล์ 91 (91, TODO), แก๊สโซฮอล์ E20 (E20, TODO), แก๊สโซฮอล์ E85 (E85, TODO), Hi Premium 97 (97, TODO), ดีเซล B7 (B7, TODO), Hi Premium Diesel S (B7, TODO) |
| **Shell** | `src/assets/brand-logos/shell.png` | FuelSave แก๊สโซฮอล์ 95 (95, TODO), FuelSave แก๊สโซฮอล์ 91 (91, TODO), แก๊สโซฮอล์ E20 (E20, TODO), V-Power Gasohol 95 (95, TODO), FuelSave Diesel B7 (B7, TODO), V-Power Diesel (B7, TODO) |
| **Esso / Mobil** | `src/assets/brand-logos/esso-mobil.png` | Supreme แก๊สโซฮอล์ 95 (95, TODO), Supreme แก๊สโซฮอล์ 91 (91, TODO), แก๊สโซฮอล์ E20 (E20, TODO), Supreme+ Gasohol 95 (95, TODO), Supreme Diesel B7 (B7, TODO) |
| **Caltex** | `src/assets/brand-logos/caltex.png` | Techron แก๊สโซฮอล์ 95 (95, TODO), Techron แก๊สโซฮอล์ 91 (91, TODO), แก๊สโซฮอล์ E20 (E20, TODO), แก๊สโซฮอล์ E85 (E85, TODO), Diesel B7 (B7, TODO), Power Diesel (B7, TODO) |
| **PT (พีที)** | `src/assets/brand-logos/pt.png` | แก๊สโซฮอล์ 95 (95, TODO), แก๊สโซฮอล์ 91 (91, TODO), แก๊สโซฮอล์ E20 (E20, TODO), แก๊สโซฮอล์ E85 (E85, TODO), ดีเซล B7 (B7, TODO), ดีเซล B20 (B20, TODO) |
| **Susco** | `src/assets/brand-logos/susco.png` | แก๊สโซฮอล์ 95 (95, TODO), แก๊สโซฮอล์ 91 (91, TODO), แก๊สโซฮอล์ E20 (E20, TODO), ดีเซล B7 (B7, TODO) |
| **อื่นๆ (Other)** | `src/assets/brand-logos/other.png` | เบนซิน 95 (95, TODO), แก๊สโซฮอล์ 95 (95, TODO), แก๊สโซฮอล์ 91 (91, TODO), E20 (E20, TODO), E85 (E85, TODO), ดีเซล B7 (B7, TODO), ดีเซล B20 (B20, TODO), NGV (NGV, TODO), LPG (LPG, TODO) |

<!-- TODO: user ยืนยันรายการนี้ (PRD Open Q2) — แบรนด์/สูตรเปลี่ยนได้ตามตลาด -->
<!-- TODO: color column ทั้งหมดเป็น placeholder — ต้องรวบรวมสีจริงต่อแบรนด์ก่อน seed.service ใช้งานจริง (plan Risks "fuel color reference ไม่มีจริงในมือ"); ถ้ารวบรวมไม่ครบก่อน implement ให้ fallback เป็น grade-standard color ที่ตกลงกันใน implementation, ไม่ใช่ค่าที่ doc นี้ยืนยัน -->
