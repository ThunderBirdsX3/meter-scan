// Entity interfaces derived from SRS §5 data model
// These are the contract between UI and FuelDataService (future SQLite repo)

export interface Vehicle {
  id: string;
  name: string;         // e.g. "Toyota Corolla"
  licensePlate: string; // e.g. "กข 1234"
  fuelTypeId: string;   // FK → FuelType.id
  createdAt: Date;
}

export interface Trip {
  id: string;
  name: string;         // e.g. "กรุงเทพ-เชียงใหม่"
  vehicleId: string;    // FK → Vehicle.id
  startOdometer?: number;
  createdAt: Date;
}

export interface Brand {
  id: string;
  name: string;         // e.g. "PTT", "Shell", "Esso"
}

export interface FuelType {
  id: string;
  name: string;         // e.g. "E20", "B7", "Gasohol 95"
  brandId?: string;     // optional grouping
}

export interface FuelEntry {
  id: string;
  vehicleId: string;
  tripId?: string;
  brandId?: string;
  fuelTypeId?: string;

  // 3 independent numeric fields (FR-001: user fills whichever known)
  liters?: number;
  pricePerLiter?: number;
  totalAmount?: number;

  odometer?: number;      // km reading at fill (FR-007)
  station?: string;       // free text
  note?: string;          // free text
  datetime: Date;

  imageUri?: string;      // temp path from Capacitor camera (may be missing — SRS Q3)
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
