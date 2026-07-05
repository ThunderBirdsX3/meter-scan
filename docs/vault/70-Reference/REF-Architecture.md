---
tags: [type/reference]
status: draft
version: 0.3.0
date: 2026-07-04
related_docs:
  - "[[PRD-fuel-log]]"
  - "[[SRS-fuel-log]]"
  - "[[REF-TechStack]]"
  - "[[2026-07-02-2140-sqlite-persistence-seed]]"
  - "[[2026-07-04-1029-brand-logo-fuel-color-assets]]"
  - "[[2026-07-03-2208-vehicle-fuel-autofill]]"
  - "[[2026-07-05-1930-vehicle-type-icons]]"
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
  logo_asset TEXT,                    -- bundled logo asset path, e.g. 'assets/brand-logos/ptt.ico' (NO 'src/' prefix — Angular serves '/assets/...' at runtime); nullable — UI falls back to placeholder if missing
  deleted_at TEXT,                    -- soft-hide timestamp; NULL = visible. Set = hidden from getBrands() picker but still resolvable via getBrandById() (config-lifecycle, no end-user UI trigger)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- fuel_type = brand-agnostic CANONICAL catalog (schema v2 — see plan [[2026-07-04-1029-brand-logo-fuel-color-assets]]).
-- A flag code (e.g. G95) means the same fuel regardless of which brand sells it; per-brand color/marketing name live on brand_fuel below.
CREATE TABLE fuel_type (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,          -- 'G91','G95','G95+','E20','E85','B95','DIESEL','DIESEL+','B20','NGV','LPG'
  label TEXT NOT NULL,                -- Thai display, e.g. 'แก๊สโซฮอล์ 95'
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,                    -- soft-hide timestamp; NULL = visible. Set = hidden from getFuelTypes() picker but still resolvable via getFuelTypeById() (config-lifecycle, no end-user UI trigger)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- brand_fuel = join: which fuels a brand sells + the per-(brand×fuel) color/marketing override.
CREATE TABLE brand_fuel (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id INTEGER NOT NULL REFERENCES brand(id) ON DELETE CASCADE,
  fuel_type_id INTEGER NOT NULL REFERENCES fuel_type(id) ON DELETE CASCADE,
  color TEXT,                         -- hex color string for this fuel as sold by that brand (e.g. '#0072BB') — real, reference-sourced (§7)
  marketing_name TEXT,                -- optional per-brand display override, e.g. 'V-Power Diesel' (Shell), 'ไฮดีเซล' (Bangchak)
  deleted_at TEXT,                    -- soft-hide timestamp; NULL = visible (config-lifecycle, same convention as brand/fuel_type)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(brand_id, fuel_type_id)
);

CREATE TABLE vehicle (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  plate TEXT,
  default_fuel_type_id INTEGER REFERENCES fuel_type(id) ON DELETE SET NULL,  -- references CANONICAL fuel_type.id (brand-agnostic) — a car burns G95 regardless of station; see [[2026-07-03-2208-vehicle-fuel-autofill]]
  vehicle_type TEXT,                  -- schema v3 (see §3 v2→v3 migration below). Nullable, enum 8 codes: motorcycle/bigbike/scooter/sedan/suv/ppv/van/truck (Thai labels — see [[SRS-fuel-log]] §5, FR-003). NULL = no icon shown.
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
  fuel_type_id INTEGER REFERENCES fuel_type(id) ON DELETE SET NULL,  -- references CANONICAL fuel_type.id (brand-agnostic); brand_id is the separate, independently-optional station brand (FR-001)
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

**Migration**: `user_version` PRAGMA เป็น schema version. `DbService` รัน migration ขั้นบันได (v0→v1 = create tables ตาม DDL ด้านบน — รวม trip active-trip fields + brand/fuel_type master-data cols). FR-010 AC#2.

**v1→v2 (schema refactor — plan [[2026-07-04-1029-brand-logo-fuel-color-assets]])**: `fuel_type` เปลี่ยนจาก per-brand row (`brand_id`/`grade`/`color`) เป็น brand-agnostic canonical catalog (`code`/`label`/`sort_order`); สี+marketing name ย้ายไป table ใหม่ `brand_fuel`. Migration: toggle `PRAGMA foreign_keys` รอบขั้นตอน, `DROP TABLE fuel_type` เก่า แล้ว `CREATE TABLE fuel_type` (catalog ใหม่) + `CREATE TABLE brand_fuel`. ผลข้างเคียงที่ยอมรับ (pre-release, ไม่มี real install): ค่า `fuel_entry.fuel_type_id` และ `vehicle.default_fuel_type_id` เดิมทั้งหมดถูก wipe เป็น `NULL` (อ้างอิง fuel_type.id เก่าที่ถูก drop ไปแล้ว) — ดู plan Risk R2. หลัง migration, `fuel_entry.fuel_type_id` และ `vehicle.default_fuel_type_id` อ้างอิง **canonical** `fuel_type.id` (brand-agnostic) — รถคันหนึ่งเติม G95 เหมือนกันไม่ว่าจะที่ปั๊มไหน ปรับปรุง autofill semantics ให้ถูกต้องขึ้น (semantic shift, ดู [[2026-07-03-2208-vehicle-fuel-autofill]] Decision #1 + plan Risk R5).

**v2→v3 (add vehicle_type column — plan [[2026-07-05-1930-vehicle-type-icons]])**: `ALTER TABLE vehicle ADD COLUMN vehicle_type TEXT;` (nullable, no backfill — existing rows get `NULL` = no icon shown). เพิ่ม `vehicle.vehicle_type` เพื่อรองรับ icon/type selection ให้รถแต่ละคัน (ดู [[SRS-fuel-log]] FR-003, §5). `DB_VERSION` → `3`.

**กม./ลิตร (FR-007, rolling)**: aggregate ต่อกลุ่ม (รถ/เดือน/ทริป) = `(max(odometer_km) − min(odometer_km) ในกลุ่ม) / Σ liters ที่นับระยะ`; นับเฉพาะกลุ่มที่มี odometer ≥ 2 จุด. ไม่เก็บค่าใน row — derived ตอน query รายงาน.

**ON DELETE policy**: vehicle/trip ลบ → fuel_entry SET NULL (entry ไม่หาย). brand/fuel_type/brand_fuel = config read-only **ไม่มี user delete** (FR-005) → entry FK ปลอดภัย; `brand_fuel` CASCADE จาก `brand` และจาก `fuel_type` ใช้เฉพาะ migration/reseed ฝั่ง config เท่านั้น (ไม่ใช่ user-triggered).

## 4. API Contracts

ไม่มี HTTP API — service-level เท่านั้น (TypeScript). สัญญาในระดับ FN spec: [[FN-DbService]], [[FN-Overview]], [[FN-Seed]] (สร้างตอน /ow-plan).

## 5. Auth

ไม่มี — no account, no login (PRD §5, SRS §2).

## 6. Deployment

- `npm run build` → `www/` → `npx cap sync` (จาก root) → `ionic cap build ios|android`
- SQLite plugin ต้อง `cap sync` หลังติดตั้ง; iOS อาจต้อง pod install (cap จัดการ)
- ดู [[REF-TechStack]] §native gotchas (camera permission, bundle id)

## 7. Seed Dataset (ชุดแบรนด์ไทย, FR-011)

> Note: brand/fuel_type/brand_fuel เป็น read-only ต่อ user (FR-005) — "แก้/ยืนยัน" ในบรรทัดข้างล่างหมายถึง config maintainer ปรับ dataset ก่อน ship เวอร์ชันถัดไป ไม่ใช่ user-facing edit.
>
> **Update mechanism (decision, 2026-07-03)**: brand/fuel_type/brand_fuel เป็น **master data** — ไม่มี CRUD ทั้งใน UI และ data layer. แก้ dataset โดยแก้ `src/app/services/seed-data.ts` แล้ว ship เป็น **seed migration ผูกกับ version bump** (หลักการเดียวกับ schema migration `user_version` §3). เพิ่มแถว = append-only ข้าม version; เลิกใช้ = soft-hide `deleted_at` (§3, FR-005) — ไม่ hard-delete → ไม่มี dangling FK. CRUD user-facing มีเฉพาะ Vehicle / Trip / FuelEntry เท่านั้น.
>
> **Model (schema v2 — plan [[2026-07-04-1029-brand-logo-fuel-color-assets]])**: `fuel_type` = brand-agnostic canonical catalog (11 flag codes below). `brand_fuel` = join per brand ที่บอกว่าแบรนด์นั้นขาย flag ไหน พร้อมสีจริงของแบรนด์นั้น (`brand_fuel.color`) และชื่อการตลาดที่ override ได้ (`brand_fuel.marketing_name`, optional). Colors ทั้งหมดจริง — มาจากตารางอ้างอิง `fuel-colors-by-brand.md`; ค่า hex ครบทุกคู่ (brand × flag) อยู่ใน plan's **Seed map** section และ `seed-data.ts` — ไม่ list ซ้ำที่นี่ (ห้ามเดาสี, ทุกค่ามี source).
>
> **Canonical flag catalog (11 codes)**: `G91`=แก๊สโซฮอล์ 91, `G95`=แก๊สโซฮอล์ 95, `G95+`=แก๊สโซฮอล์ 95 พรีเมียม, `E20`=แก๊สโซฮอล์ E20, `E85`=แก๊สโซฮอล์ E85, `B95`=เบนซิน 95 (ULG ไร้เอทานอล — **คนละตัวกับ `G95`** gasohol), `DIESEL`=ดีเซล, `DIESEL+`=ดีเซลพรีเมียม, `B20`=ดีเซล B20, `NGV`=NGV, `LPG`=LPG. `LPG` เป็น catalog-only ในเซ็ทนี้ (ไม่มีแบรนด์ไหนขายใน seed data ปัจจุบัน) → เลือกได้โดยปล่อย brand เป็น null (FR-001).
>
> **Brand roster (8 brands)**: PTT, Bangchak, Shell, Caltex, PT, IRPC, Susco, PURE. **ตัดออก**: Esso/Mobil, Sinopec (ไม่มีใน color reference table), และแบรนด์ **`อื่นๆ (Other)`** (ไม่จำเป็นอีกต่อไป — canonical fuel เลือกได้โดยปล่อย brand เป็น null อยู่แล้ว ตาม FR-001 = "unlisted station" คือ null brand + catalog fuel).
>
> **Logo asset**: path convention `assets/brand-logos/<brand-slug>.ico` (ไม่มี `src/` prefix — Angular serve `/assets/...` ตอน runtime; ของเดิมมี `src/` prefix เป็น bug ทำให้ 404 เสมอ, แก้ในพลานนี้).
>
> **`SEED_CONFIG_VERSION`**: bump เป็น `'2'` — เมื่อ version ไม่ตรงกับ guard row เดิม, seed จะ wipe `brand`/`fuel_type`/`brand_fuel` แล้ว reseed ทั้งชุด (dev reset, pre-release เท่านั้น — ดู §3 migration v1→v2).

| Brand | Logo asset | Fuel codes offered (brand_fuel) — `code (marketing name)` |
|---|---|---|
| **PTT** | `assets/brand-logos/ptt.ico` | G95, G91, E20, E85, G95+, B95, DIESEL, DIESEL+, NGV |
| **Bangchak** | `assets/brand-logos/bangchak.ico` | G95 (ไฮเอโว 95S), G91 (ไฮเอโว 91S), E20, E85, G95+ (Hi Premium 97), DIESEL (ไฮดีเซล), DIESEL+ (ไฮพรีเมียมดีเซล) |
| **Shell** | `assets/brand-logos/shell.ico` | G95 (FuelSave 95), G91 (FuelSave 91), E20, G95+ (V-Power 95), DIESEL (FuelSave Diesel), DIESEL+ (V-Power Diesel) |
| **Caltex** | `assets/brand-logos/caltex.ico` | G95, G91, E20, B95, DIESEL, DIESEL+ |
| **PT (พีที)** | `assets/brand-logos/pt.ico` | G95, G91, E20, B95, DIESEL, DIESEL+ |
| **IRPC** | `assets/brand-logos/irpc.ico` | G95, G91, DIESEL |
| **Susco** | `assets/brand-logos/susco.ico` | G95, G91, E20, B95, DIESEL, B20 |
| **PURE** | `assets/brand-logos/pure.ico` | G95, G91, E20, DIESEL, B20 |

> ค่า hex สีจริงต่อ (brand × code) ทั้งหมด — ดู plan [[2026-07-04-1029-brand-logo-fuel-color-assets]] section "Seed map" หรือ `src/app/services/seed-data.ts` โดยตรง (single source ของค่า, ไม่ duplicate ที่นี่เพื่อกันข้อมูลเพี้ยนสองที่).
