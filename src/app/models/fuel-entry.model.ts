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
  name: string;           // e.g. "PTT", "Shell", "Esso"

  // Master-data enrich (plan 2026-07-02-2140-sqlite-persistence-seed)
  logoAsset?: string;      // bundled logo asset path, e.g. 'src/assets/brand-logos/ptt.png'; falls back to placeholder if missing
  deletedAt?: Date;        // soft-hide (config-lifecycle capability, no user-facing UI trigger — SRS FR-005 §Config lifecycle)
}

export interface FuelType {
  id: number;
  name: string;            // e.g. "E20", "B7", "Gasohol 95"
  brandId?: number;        // FK → Brand.id
  grade?: string;           // e.g. '95','91','E20','B7' — DDL `fuel_type.grade`

  // Master-data enrich (plan 2026-07-02-2140-sqlite-persistence-seed)
  color?: string;           // hex color string as sold by that brand; TODO real reference — see seed-data.ts
  deletedAt?: Date;         // soft-hide (config-lifecycle capability, no user-facing UI trigger — SRS FR-005 §Config lifecycle)
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
  kmPerLiter?: number;    // กม./ลิตร (stub: precomputed)
  groupRows: StatGroupRow[];
}

export interface StatGroupRow {
  label: string;       // trip name / month label / vehicle name
  amount: number;
  liters: number;
  count: number;
}
