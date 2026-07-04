// Entity interfaces derived from SRS §5 data model
// These are the contract between UI and FuelDataService (real SQLite repo — see DbService)
//
// id type: all PK + FK reference fields are `number` (SQLite INTEGER PRIMARY KEY AUTOINCREMENT).
// See REF-Architecture §3 DDL + plan 2026-07-02-2140-sqlite-persistence-seed (Doc Gap #1).

export interface Vehicle {
  id: number;
  name: string;          // e.g. "Toyota Corolla"
  licensePlate?: string;  // maps to DDL column `plate` (Doc Gap #3/#4 — model field name kept, DbService maps the name)
  fuelTypeId?: number;    // maps to DDL column `default_fuel_type_id`; FK → FuelType.id (nullable)
  createdAt: Date;
}

export interface Trip {
  id: number;
  name: string;           // e.g. "กรุงเทพ-เชียงใหม่"
  vehicleId?: number;     // FK → Vehicle.id (nullable — SRS §5 trip.vehicle_id optional)
  startOdometer?: number;
  createdAt: Date;

  // Active-trip lifecycle (SRS Clarify 2026-06-30 Q1 / Doc Gap #2)
  isActive: boolean;
  endedAt?: Date;
  endOdometer?: number;
}

export interface Brand {
  id: number;
  name: string;           // e.g. "PTT", "Shell"

  // Master-data enrich (plan 2026-07-02-2140-sqlite-persistence-seed)
  logoAsset?: string;      // bundled logo asset path, e.g. 'assets/brand-logos/ptt.ico' (NO 'src/' prefix); falls back to placeholder if missing
  deletedAt?: Date;        // soft-hide (config-lifecycle capability, no user-facing UI trigger — SRS FR-005 §Config lifecycle)
}

// FuelType = brand-agnostic CANONICAL catalog (schema v2 — plan 2026-07-04-1029-brand-logo-fuel-color-assets).
// A flag code (e.g. G95) means the same fuel regardless of which brand sells it; per-brand color /
// marketing name live on BrandFuel below.
export interface FuelType {
  id: number;
  code: string;             // 'G91','G95','G95+','E20','E85','B95','DIESEL','DIESEL+','B20','NGV','LPG'
  label: string;            // Thai display label, e.g. 'แก๊สโซฮอล์ 95'
  sortOrder?: number;       // catalog display order — DDL `fuel_type.sort_order`
  deletedAt?: Date;         // soft-hide (config-lifecycle capability, no user-facing UI trigger — SRS FR-005 §Config lifecycle)
}

// BrandFuel = join row: which fuels a brand sells + the per-(brand×fuel) color/marketing override.
export interface BrandFuel {
  id: number;
  brandId: number;          // FK → Brand.id
  fuelTypeId: number;       // FK → FuelType.id (canonical)
  color?: string;           // hex color as sold by that brand, e.g. '#0072BB' — real, reference-sourced
  marketingName?: string;   // optional per-brand display override, e.g. 'V-Power Diesel'
  deletedAt?: Date;         // soft-hide (config-lifecycle capability, no user-facing UI trigger — SRS FR-005 §Config lifecycle)
}

// BrandFuelOption = resolved join view for pickers (BrandFuel + its canonical code/label denormalized).
export interface BrandFuelOption {
  brandId: number;
  fuelTypeId: number;
  code: string;
  label: string;
  color?: string;
  marketingName?: string;
}

export interface FuelEntry {
  id: number;
  vehicleId?: number;      // FK, nullable (SRS §5 — vehicle optional; ON DELETE SET NULL)
  tripId?: number;         // FK, nullable
  brandId?: number;
  fuelTypeId?: number;

  // 3 independent numeric fields (FR-001: user fills whichever known)
  liters?: number;
  pricePerLiter?: number;
  totalAmount?: number;

  odometer?: number;      // km reading at fill (FR-007)
  station?: string;       // free text
  note?: string;          // free text
  datetime: Date;

  imageUri?: string;      // gallery URI from Capacitor camera (may be missing — SRS Clarify 2026-06-30 Q2)
  scanFields?: ScanField[]; // CRNN read result (autofill source)
  createdAt: Date;
}

export interface ScanField {
  label: string;  // "Amount" | "Liters" | "Price"
  text: string;   // digit string or "—"
  roi: { x: number; y: number; w: number; h: number };
}

// Aggregated view data for Stats screen (FR-008)
export interface OverviewStats {
  segmentKey: 'trip' | 'month' | 'vehicle';
  totalAmount: number;    // ฿
  totalLiters: number;    // L
  fillCount: number;
  avgPricePerLiter: number; // ฿/L
  kmPerLiter?: number;    // กม./ลิตร — rolling tank-to-tank, sub-grouped per vehicle then summed (FR-007)
  groupRows: StatGroupRow[];
}

export interface StatGroupRow {
  label: string;       // trip name / month label / vehicle name
  amount: number;
  liters: number;
  count: number;
  kmPerLiter?: number; // กม./ลิตร of this group only; undefined if not computable (FR-008 AC4)
}
