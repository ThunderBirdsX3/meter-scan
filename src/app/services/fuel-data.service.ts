import { Injectable } from '@angular/core';
import { DbService } from './db.service';
import {
  Brand,
  BrandFuelOption,
  FuelEntry,
  FuelType,
  OverviewStats,
  StatGroupRow,
  Trip,
  Vehicle,
} from '../models/fuel-entry.model';

/**
 * Pure helper — rolling tank-to-tank กม./ลิตร for a set of entries (FR-007).
 *
 * Sub-groups the given entries by `vehicleId` (odometer readings are only comparable within the
 * same vehicle — plan Decision D1), computes distance/liters-counted per sub-group, then sums
 * across sub-groups before dividing ONCE: `groupKmPerLiter = Σdistance ÷ ΣlitersCounted`.
 *
 * Exported standalone (not a class method) so it stays a pure, independently-testable function
 * per plan Implementation Step 2 / Test Plan.
 */
export function computeKmPerLiter(entries: FuelEntry[]): number | undefined {
  const subGroups = new Map<string, FuelEntry[]>();
  for (const e of entries) {
    const key = e.vehicleId != null ? `v${e.vehicleId}` : 'unassigned';
    const bucket = subGroups.get(key);
    if (bucket) bucket.push(e);
    else subGroups.set(key, [e]);
  }

  let totalDistance = 0;
  let totalLitersCounted = 0;

  for (const sub of subGroups.values()) {
    const withOdo = sub.filter((e) => e.odometer != null && e.liters != null);
    if (withOdo.length < 2) continue; // < 2 odometer points → this (sub)group not computable

    // Find the baseline entry (lowest odometer) by index — ties excluded once, not all instances.
    let baselineIdx = 0;
    for (let i = 1; i < withOdo.length; i++) {
      if (withOdo[i].odometer! < withOdo[baselineIdx].odometer!) baselineIdx = i;
    }
    const maxOdometer = Math.max(...withOdo.map((e) => e.odometer!));
    const distance = maxOdometer - withOdo[baselineIdx].odometer!;
    if (distance <= 0) continue;

    const litersCounted = withOdo.reduce(
      (sum, e, idx) => (idx === baselineIdx ? sum : sum + (e.liters ?? 0)),
      0,
    );

    totalDistance += distance;
    totalLitersCounted += litersCounted;
  }

  return totalLitersCounted > 0 ? totalDistance / totalLitersCounted : undefined;
}

/**
 * FuelDataService — typed seam between UI and the data layer.
 *
 * Every CRUD method delegates to `DbService` (real SQLite persistence, FR-010). UI keeps
 * binding to this interface only.
 *
 * `getOverview()` computes real aggregation + rolling tank-to-tank กม./ลิตร from `DbService`
 * entries (FR-007/FR-008) — no hardcoded sample numbers. Never throws even when the
 * underlying database is empty (empty entries → zeroed summary + empty `groupRows`).
 */
@Injectable({ providedIn: 'root' })
export class FuelDataService {

  constructor(private db: DbService) {}

  // ── Vehicles ───────────────────────────────────────────────────────────────

  async getVehicles(): Promise<Vehicle[]> {
    return this.db.getVehicles();
  }

  async addVehicle(v: Omit<Vehicle, 'id' | 'createdAt'>): Promise<Vehicle> {
    return this.db.addVehicle(v);
  }

  async updateVehicle(id: number, patch: Partial<Omit<Vehicle, 'id' | 'createdAt'>>): Promise<Vehicle> {
    return this.db.updateVehicle(id, patch);
  }

  async deleteVehicle(id: number): Promise<void> {
    return this.db.deleteVehicle(id);
  }

  // ── Trips ──────────────────────────────────────────────────────────────────

  async getTrips(): Promise<Trip[]> {
    return this.db.getTrips();
  }

  async addTrip(t: Omit<Trip, 'id' | 'createdAt'>): Promise<Trip> {
    return this.db.addTrip(t);
  }

  async updateTrip(id: number, patch: Partial<Omit<Trip, 'id' | 'createdAt'>>): Promise<Trip> {
    return this.db.updateTrip(id, patch);
  }

  async deleteTrip(id: number): Promise<void> {
    return this.db.deleteTrip(id);
  }

  // ── Brands + FuelTypes (read-only for the app; soft-delete = data-layer capability) ────────

  async getBrands(): Promise<Brand[]> {
    return this.db.getBrands();
  }

  async getFuelTypes(): Promise<FuelType[]> {
    return this.db.getFuelTypes();
  }

  /** Unfiltered — resolves a brand even if it has been soft-hidden (SRS FR-005 AC#4). */
  async getBrandById(id: number): Promise<Brand | null> {
    return this.db.getBrandById(id);
  }

  /** Unfiltered — resolves a fuel type even if it has been soft-hidden (SRS FR-005 AC#4). */
  async getFuelTypeById(id: number): Promise<FuelType | null> {
    return this.db.getFuelTypeById(id);
  }

  /** Which canonical fuels a brand sells + its per-brand color/marketing name (Add picker filter). */
  async getBrandFuels(brandId: number): Promise<BrandFuelOption[]> {
    return this.db.getBrandFuels(brandId);
  }

  /** Full brand_fuel join, unfiltered by brand — master-data grid source. */
  async getAllBrandFuels(): Promise<BrandFuelOption[]> {
    return this.db.getAllBrandFuels();
  }

  /** Hex color for one (brand, canonical fuel) pair, or null. */
  async getFuelColor(brandId: number, fuelTypeId: number): Promise<string | null> {
    return this.db.getFuelColor(brandId, fuelTypeId);
  }

  // ── Fuel Entries ───────────────────────────────────────────────────────────

  async getEntries(filter?: { vehicleId?: number; tripId?: number }): Promise<FuelEntry[]> {
    return this.db.getEntries(filter);
  }

  async getEntry(id: number): Promise<FuelEntry | null> {
    return this.db.getEntry(id);
  }

  async addEntry(e: Omit<FuelEntry, 'id' | 'createdAt'>): Promise<FuelEntry> {
    return this.db.addEntry(e);
  }

  async updateEntry(id: number, patch: Partial<Omit<FuelEntry, 'id' | 'createdAt'>>): Promise<FuelEntry> {
    return this.db.updateEntry(id, patch);
  }

  async deleteEntry(id: number): Promise<void> {
    return this.db.deleteEntry(id);
  }

  // ── Overview / Stats ───────────────────────────────────────────────────────

  /**
   * Groups entries by segment label (FR-008):
   * - trip → trip name, fallback "ไม่ระบุทริป" (FR-004 fallback convention)
   * - vehicle → vehicle name, fallback "ไม่ระบุรถ"
   * - month → Thai month/year label from `datetime` (same `Intl.DateTimeFormat('th-TH', ...)`
   *   convention already used by history.page.ts month grouping)
   */
  private groupEntries(
    entries: FuelEntry[],
    segment: 'trip' | 'month' | 'vehicle',
    vehicleMap: Map<number, string>,
    tripMap: Map<number, string>,
  ): Map<string, FuelEntry[]> {
    const groups = new Map<string, FuelEntry[]>();
    for (const e of entries) {
      let label: string;
      switch (segment) {
        case 'trip':
          label = (e.tripId != null ? tripMap.get(e.tripId) : undefined) ?? 'ไม่ระบุทริป';
          break;
        case 'vehicle':
          label = (e.vehicleId != null ? vehicleMap.get(e.vehicleId) : undefined) ?? 'ไม่ระบุรถ';
          break;
        case 'month':
        default:
          label = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(e.datetime);
          break;
      }
      const bucket = groups.get(label);
      if (bucket) bucket.push(e);
      else groups.set(label, [e]);
    }
    return groups;
  }

  /**
   * Real aggregation engine (FR-007/FR-008) — reads all fuel entries via `DbService.getEntries()`
   * (single query, NFR-001 O(n) in-memory aggregation), resolves vehicle/trip names, groups by
   * the selected segment, and computes rolling tank-to-tank กม./ลิตร per group + overall
   * (plan Decisions D1/D2). No hardcoded sample numbers; never throws on an empty database.
   */
  async getOverview(segment: 'trip' | 'month' | 'vehicle'): Promise<OverviewStats> {
    const [entries, vehicles, trips] = await Promise.all([
      this.db.getEntries(),
      this.db.getVehicles(),
      this.db.getTrips(),
    ]);

    const vehicleMap = new Map(vehicles.map((v) => [v.id, v.name]));
    const tripMap = new Map(trips.map((t) => [t.id, t.name]));

    const totalAmount = entries.reduce((sum, e) => sum + (e.totalAmount ?? 0), 0);
    const totalLiters = entries.reduce((sum, e) => sum + (e.liters ?? 0), 0);
    const fillCount = entries.length;
    const avgPricePerLiter = totalLiters > 0 ? totalAmount / totalLiters : 0;
    const kmPerLiter = computeKmPerLiter(entries);

    const groupMap = this.groupEntries(entries, segment, vehicleMap, tripMap);

    const groupRows: StatGroupRow[] = Array.from(groupMap.entries())
      .map(([label, groupEntries]) => ({
        row: {
          label,
          amount: groupEntries.reduce((sum, e) => sum + (e.totalAmount ?? 0), 0),
          liters: groupEntries.reduce((sum, e) => sum + (e.liters ?? 0), 0),
          count: groupEntries.length,
          kmPerLiter: computeKmPerLiter(groupEntries),
        } as StatGroupRow,
        groupEntries,
      }))
      .sort((a, b) => {
        if (segment === 'month') {
          // Newest → oldest, keyed by each group's latest entry datetime.
          const aMax = Math.max(...a.groupEntries.map((e) => e.datetime.getTime()));
          const bMax = Math.max(...b.groupEntries.map((e) => e.datetime.getTime()));
          return bMax - aMax;
        }
        // trip/vehicle: amount มาก → น้อย
        return b.row.amount - a.row.amount;
      })
      .map((x) => x.row);

    return { segmentKey: segment, totalAmount, totalLiters, fillCount, avgPricePerLiter, kmPerLiter, groupRows };
  }
}
