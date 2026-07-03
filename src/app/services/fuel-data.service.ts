import { Injectable } from '@angular/core';
import { DbService } from './db.service';
import {
  Brand,
  FuelEntry,
  FuelType,
  OverviewStats,
  Trip,
  Vehicle,
} from '../models/fuel-entry.model';

/**
 * FuelDataService — typed seam between UI and the data layer.
 *
 * Drop-in replacement for the former in-memory stub: every CRUD method now delegates to
 * `DbService` (real SQLite persistence, FR-010). UI keeps binding to this interface only.
 *
 * `getOverview()` REMAINS a stub — real กม./ลิตร + aggregation engine (FR-007/FR-008) is
 * explicitly out of scope for this plan (see plan Non-goals). It must not throw even though
 * the underlying entries now come from a real (possibly empty) database.
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
   * Returns precomputed stub overview stats for the given segment.
   * Real calculation engine is deferred to a future plan (FR-007/FR-008 Non-goal).
   */
  async getOverview(segment: 'trip' | 'month' | 'vehicle'): Promise<OverviewStats> {
    // Fixed sample numbers — do NOT drive real calculations from these
    const base = {
      totalAmount: 7738.21,
      totalLiters: 194.5,
      fillCount: 6,
      avgPricePerLiter: 39.79,
      kmPerLiter: 14.2,
    };

    let groupRows: OverviewStats['groupRows'] = [];

    switch (segment) {
      case 'trip':
        groupRows = [
          { label: 'กรุงเทพ–เชียงใหม่', amount: 4587.80, liters: 113.7, count: 3 },
          { label: 'ทริปประจำวัน',       amount: 3150.41, liters: 80.8,  count: 3 },
        ];
        break;
      case 'month':
        groupRows = [
          { label: 'มิ.ย. 2026', amount: 7738.21, liters: 194.5, count: 6 },
        ];
        break;
      case 'vehicle':
        groupRows = [
          { label: 'Toyota Corolla', amount: 4587.80, liters: 113.7, count: 3 },
          { label: 'Honda Jazz',     amount: 3150.41, liters: 80.8,  count: 3 },
        ];
        break;
    }

    return { segmentKey: segment, ...base, groupRows };
  }
}
