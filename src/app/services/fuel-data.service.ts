import { Injectable } from '@angular/core';
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
 * This stub implementation returns fixed in-memory data shaped exactly like
 * the future SQLite repository that the backend plan will implement.
 * UI binds to this interface only — swapping real persistence = drop-in.
 *
 * All methods return Promises (async) to match the SQLite repo shape.
 * NO real calculations; overview returns precomputed sample numbers.
 */
@Injectable({ providedIn: 'root' })
export class FuelDataService {

  // ── Seed data ──────────────────────────────────────────────────────────────

  private vehicles: Vehicle[] = [
    { id: 'v1', name: 'Toyota Corolla', licensePlate: 'กข 1234', fuelTypeId: 'ft1', createdAt: new Date('2026-01-15') },
    { id: 'v2', name: 'Honda Jazz',     licensePlate: 'คง 5678', fuelTypeId: 'ft2', createdAt: new Date('2026-02-01') },
  ];

  private trips: Trip[] = [
    { id: 't1', name: 'กรุงเทพ–เชียงใหม่', vehicleId: 'v1', startOdometer: 45200, createdAt: new Date('2026-05-01') },
    { id: 't2', name: 'ทริปประจำวัน',       vehicleId: 'v2', createdAt: new Date('2026-06-01') },
  ];

  private brands: Brand[] = [
    { id: 'b1', name: 'PTT' },
    { id: 'b2', name: 'Shell' },
    { id: 'b3', name: 'Esso' },
    { id: 'b4', name: 'Bangchak' },
    { id: 'b5', name: 'Caltex' },
  ];

  private fuelTypes: FuelType[] = [
    { id: 'ft1', name: 'Gasohol 95' },
    { id: 'ft2', name: 'Gasohol 91' },
    { id: 'ft3', name: 'E20' },
    { id: 'ft4', name: 'E85' },
    { id: 'ft5', name: 'B7' },
    { id: 'ft6', name: 'Hi-Diesel' },
  ];

  private entries: FuelEntry[] = [
    {
      id: 'e1', vehicleId: 'v1', tripId: 't1', brandId: 'b1', fuelTypeId: 'ft1',
      liters: 35.5, pricePerLiter: 40.35, totalAmount: 1432.43,
      odometer: 45350, station: 'PTT วิภาวดี', datetime: new Date('2026-06-28T09:15:00'),
      createdAt: new Date('2026-06-28T09:15:00'),
    },
    {
      id: 'e2', vehicleId: 'v2', tripId: 't2', brandId: 'b2', fuelTypeId: 'ft2',
      liters: 28.0, pricePerLiter: 38.99, totalAmount: 1091.72,
      odometer: 23100, station: 'Shell รัชดา', datetime: new Date('2026-06-25T18:30:00'),
      createdAt: new Date('2026-06-25T18:30:00'),
    },
    {
      id: 'e3', vehicleId: 'v1', tripId: 't1', brandId: 'b3', fuelTypeId: 'ft1',
      liters: 40.0, pricePerLiter: 40.35, totalAmount: 1614.00,
      odometer: 45680, station: 'Esso ลำปาง', note: 'เต็มถัง', datetime: new Date('2026-06-22T14:00:00'),
      createdAt: new Date('2026-06-22T14:00:00'),
    },
    {
      id: 'e4', vehicleId: 'v2', brandId: 'b1', fuelTypeId: 'ft2',
      liters: 22.3, pricePerLiter: 38.99, totalAmount: 869.49,
      odometer: 22850, datetime: new Date('2026-06-18T11:20:00'),
      createdAt: new Date('2026-06-18T11:20:00'),
    },
    {
      id: 'e5', vehicleId: 'v1', tripId: 't1', brandId: 'b4', fuelTypeId: 'ft1',
      liters: 38.2, pricePerLiter: 40.35, totalAmount: 1541.37,
      odometer: 45050, station: 'Bangchak ดอนเมือง', datetime: new Date('2026-06-15T07:45:00'),
      createdAt: new Date('2026-06-15T07:45:00'),
    },
    {
      id: 'e6', vehicleId: 'v2', tripId: 't2', brandId: 'b5', fuelTypeId: 'ft2',
      liters: 30.5, pricePerLiter: 38.99, totalAmount: 1189.20,
      odometer: 22600, datetime: new Date('2026-06-10T16:00:00'),
      createdAt: new Date('2026-06-10T16:00:00'),
    },
  ];

  // ── Vehicles ───────────────────────────────────────────────────────────────

  async getVehicles(): Promise<Vehicle[]> {
    return [...this.vehicles];
  }

  async addVehicle(v: Omit<Vehicle, 'id' | 'createdAt'>): Promise<Vehicle> {
    const created: Vehicle = { ...v, id: this.uid(), createdAt: new Date() };
    this.vehicles.push(created);
    return created;
  }

  async updateVehicle(id: string, patch: Partial<Omit<Vehicle, 'id' | 'createdAt'>>): Promise<Vehicle> {
    const idx = this.vehicles.findIndex(v => v.id === id);
    if (idx === -1) throw new Error('Vehicle not found');
    this.vehicles[idx] = { ...this.vehicles[idx], ...patch };
    return this.vehicles[idx];
  }

  async deleteVehicle(id: string): Promise<void> {
    this.vehicles = this.vehicles.filter(v => v.id !== id);
  }

  // ── Trips ──────────────────────────────────────────────────────────────────

  async getTrips(): Promise<Trip[]> {
    return [...this.trips];
  }

  async addTrip(t: Omit<Trip, 'id' | 'createdAt'>): Promise<Trip> {
    const created: Trip = { ...t, id: this.uid(), createdAt: new Date() };
    this.trips.push(created);
    return created;
  }

  async updateTrip(id: string, patch: Partial<Omit<Trip, 'id' | 'createdAt'>>): Promise<Trip> {
    const idx = this.trips.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Trip not found');
    this.trips[idx] = { ...this.trips[idx], ...patch };
    return this.trips[idx];
  }

  async deleteTrip(id: string): Promise<void> {
    this.trips = this.trips.filter(t => t.id !== id);
  }

  // ── Brands + FuelTypes (read-only) ────────────────────────────────────────

  async getBrands(): Promise<Brand[]> {
    return [...this.brands];
  }

  async getFuelTypes(): Promise<FuelType[]> {
    return [...this.fuelTypes];
  }

  // ── Fuel Entries ───────────────────────────────────────────────────────────

  async getEntries(filter?: { vehicleId?: string; tripId?: string }): Promise<FuelEntry[]> {
    let list = [...this.entries];
    if (filter?.vehicleId) list = list.filter(e => e.vehicleId === filter.vehicleId);
    if (filter?.tripId)    list = list.filter(e => e.tripId === filter.tripId);
    // newest first
    return list.sort((a, b) => b.datetime.getTime() - a.datetime.getTime());
  }

  async getEntry(id: string): Promise<FuelEntry | null> {
    return this.entries.find(e => e.id === id) ?? null;
  }

  async addEntry(e: Omit<FuelEntry, 'id' | 'createdAt'>): Promise<FuelEntry> {
    const created: FuelEntry = { ...e, id: this.uid(), createdAt: new Date() };
    this.entries.unshift(created);
    return created;
  }

  async updateEntry(id: string, patch: Partial<Omit<FuelEntry, 'id' | 'createdAt'>>): Promise<FuelEntry> {
    const idx = this.entries.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Entry not found');
    this.entries[idx] = { ...this.entries[idx], ...patch };
    return this.entries[idx];
  }

  async deleteEntry(id: string): Promise<void> {
    this.entries = this.entries.filter(e => e.id !== id);
  }

  // ── Overview / Stats ───────────────────────────────────────────────────────

  /**
   * Returns precomputed stub overview stats for the given segment.
   * Real calculation engine is deferred to the backend plan (Non-goal).
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

  // ── Helpers ────────────────────────────────────────────────────────────────

  private uid(): string {
    return Math.random().toString(36).slice(2, 10);
  }
}
