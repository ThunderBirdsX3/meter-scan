import { TestBed } from '@angular/core/testing';
import { FuelDataService, computeKmPerLiter } from './fuel-data.service';
import { DbService } from './db.service';
import { FuelEntry, Vehicle, Trip } from '../models/fuel-entry.model';

// ── Fixture helpers ──────────────────────────────────────────────────────────

let nextId = 1;

function makeEntry(overrides: Partial<FuelEntry> = {}): FuelEntry {
  return {
    id: nextId++,
    datetime: new Date('2026-06-01T00:00:00Z'),
    createdAt: new Date('2026-06-01T00:00:00Z'),
    ...overrides,
  };
}

function makeVehicle(id: number, name: string): Vehicle {
  return { id, name, createdAt: new Date('2026-01-01T00:00:00Z') };
}

function makeTrip(id: number, name: string): Trip {
  return { id, name, createdAt: new Date('2026-01-01T00:00:00Z'), isActive: false };
}

describe('computeKmPerLiter (pure helper — FR-007)', () => {
  it('AC1: single vehicle, 2 odometer points [odo10000/L40, odo10400/L35] → km/L = 11.4', () => {
    const entries = [
      makeEntry({ vehicleId: 1, odometer: 10000, liters: 40 }),
      makeEntry({ vehicleId: 1, odometer: 10400, liters: 35 }),
    ];
    const result = computeKmPerLiter(entries);
    expect(result).toBeCloseTo(400 / 35, 5); // 11.428... → rounds to 11.4 for display
  });

  it('returns undefined when a group has < 2 entries with odometer', () => {
    const entries = [makeEntry({ vehicleId: 1, odometer: 10000, liters: 40 })];
    expect(computeKmPerLiter(entries)).toBeUndefined();
  });

  it('excludes only the baseline (lowest-odometer) entry\'s liters from litersCounted', () => {
    const entries = [
      makeEntry({ vehicleId: 1, odometer: 5000, liters: 100 }), // baseline — excluded
      makeEntry({ vehicleId: 1, odometer: 5300, liters: 20 }),
      makeEntry({ vehicleId: 1, odometer: 5600, liters: 25 }),
    ];
    // distance = 5600-5000=600; litersCounted = 20+25=45 (100 excluded)
    const result = computeKmPerLiter(entries);
    expect(result).toBeCloseTo(600 / 45, 5);
  });

  it('multi-vehicle: sums Σdistance ÷ Σliters across sub-groups, does not average per-vehicle rates', () => {
    const entries = [
      // Vehicle A: distance 400, litersCounted 35
      makeEntry({ vehicleId: 1, odometer: 10000, liters: 40 }),
      makeEntry({ vehicleId: 1, odometer: 10400, liters: 35 }),
      // Vehicle B: distance 200, litersCounted 10
      makeEntry({ vehicleId: 2, odometer: 500, liters: 15 }),
      makeEntry({ vehicleId: 2, odometer: 700, liters: 10 }),
    ];
    const result = computeKmPerLiter(entries);
    // Σdistance = 600, Σliters = 45 → NOT (11.43+20)/2
    expect(result).toBeCloseTo(600 / 45, 5);
  });

  it('returns undefined for empty input', () => {
    expect(computeKmPerLiter([])).toBeUndefined();
  });
});

describe('FuelDataService (facade over DbService)', () => {
  let service: FuelDataService;
  let dbSpy: jasmine.SpyObj<DbService>;

  beforeEach(() => {
    dbSpy = jasmine.createSpyObj<DbService>('DbService', [
      'getVehicles', 'addVehicle', 'updateVehicle', 'deleteVehicle',
      'getTrips', 'addTrip', 'updateTrip', 'deleteTrip',
      'getBrands', 'getFuelTypes', 'getBrandById', 'getFuelTypeById',
      'getEntries', 'getEntry', 'addEntry', 'updateEntry', 'deleteEntry',
    ]);

    TestBed.configureTestingModule({
      providers: [{ provide: DbService, useValue: dbSpy }],
    });
    service = TestBed.inject(FuelDataService);
  });

  it('delegates getVehicles()/getEntries()/getEntry() to DbService', async () => {
    dbSpy.getVehicles.and.resolveTo([]);
    dbSpy.getEntries.and.resolveTo([]);
    dbSpy.getEntry.and.resolveTo(null);

    await service.getVehicles();
    await service.getEntries({ vehicleId: 3 });
    await service.getEntry(9);

    expect(dbSpy.getVehicles).toHaveBeenCalled();
    expect(dbSpy.getEntries).toHaveBeenCalledWith({ vehicleId: 3 });
    expect(dbSpy.getEntry).toHaveBeenCalledWith(9);
  });

  it('delegates getBrandById()/getFuelTypeById() (unfiltered resolve — SRS FR-005 AC#4)', async () => {
    dbSpy.getBrandById.and.resolveTo(null);
    dbSpy.getFuelTypeById.and.resolveTo(null);

    await service.getBrandById(1);
    await service.getFuelTypeById(2);

    expect(dbSpy.getBrandById).toHaveBeenCalledWith(1);
    expect(dbSpy.getFuelTypeById).toHaveBeenCalledWith(2);
  });

  describe('getOverview() — real aggregation (FR-007/FR-008)', () => {
    it('reads via DbService.getEntries()/getVehicles()/getTrips() — no hardcoded numbers', async () => {
      dbSpy.getEntries.and.resolveTo([]);
      dbSpy.getVehicles.and.resolveTo([]);
      dbSpy.getTrips.and.resolveTo([]);

      const result = await service.getOverview('trip');

      expect(dbSpy.getEntries).toHaveBeenCalled();
      expect(result.segmentKey).toBe('trip');
      expect(result.totalAmount).toBe(0);
      expect(result.fillCount).toBe(0);
      expect(result.groupRows).toEqual([]);
      expect(result.kmPerLiter).toBeUndefined();
    });

    it("AC1 (month): 2 entries in June sum to 1750 amount, count 2", async () => {
      dbSpy.getEntries.and.resolveTo([
        makeEntry({ datetime: new Date(2026, 5, 10), totalAmount: 1050, liters: 25 }),
        makeEntry({ datetime: new Date(2026, 5, 20), totalAmount: 700, liters: 18 }),
      ]);
      dbSpy.getVehicles.and.resolveTo([]);
      dbSpy.getTrips.and.resolveTo([]);

      const result = await service.getOverview('month');

      expect(result.groupRows.length).toBe(1);
      expect(result.groupRows[0].amount).toBe(1750);
      expect(result.groupRows[0].count).toBe(2);
      expect(result.totalAmount).toBe(1750);
      expect(result.fillCount).toBe(2);
    });

    it('AC2 (vehicle): entries for two vehicles are grouped separately, not mixed', async () => {
      dbSpy.getEntries.and.resolveTo([
        makeEntry({ vehicleId: 1, totalAmount: 500, liters: 10 }),
        makeEntry({ vehicleId: 1, totalAmount: 300, liters: 8 }),
        makeEntry({ vehicleId: 2, totalAmount: 200, liters: 5 }),
      ]);
      dbSpy.getVehicles.and.resolveTo([makeVehicle(1, 'Toyota Corolla'), makeVehicle(2, 'Honda Jazz')]);
      dbSpy.getTrips.and.resolveTo([]);

      const result = await service.getOverview('vehicle');

      expect(result.groupRows.length).toBe(2);
      const toyota = result.groupRows.find((r) => r.label === 'Toyota Corolla');
      const honda = result.groupRows.find((r) => r.label === 'Honda Jazz');
      expect(toyota?.amount).toBe(800);
      expect(toyota?.count).toBe(2);
      expect(honda?.amount).toBe(200);
      expect(honda?.count).toBe(1);
    });

    it('AC3 (trip): entry with no tripId falls back to "ไม่ระบุทริป"', async () => {
      dbSpy.getEntries.and.resolveTo([
        makeEntry({ tripId: undefined, totalAmount: 100, liters: 5 }),
      ]);
      dbSpy.getVehicles.and.resolveTo([]);
      dbSpy.getTrips.and.resolveTo([makeTrip(1, 'กรุงเทพ–เชียงใหม่')]);

      const result = await service.getOverview('trip');

      expect(result.groupRows.length).toBe(1);
      expect(result.groupRows[0].label).toBe('ไม่ระบุทริป');
    });

    it('AC4: kmPerLiter is undefined (UI renders "—") when no group has ≥2 odometer points', async () => {
      dbSpy.getEntries.and.resolveTo([
        makeEntry({ vehicleId: 1, tripId: 1, odometer: 10000, liters: 40, totalAmount: 900 }),
      ]);
      dbSpy.getVehicles.and.resolveTo([makeVehicle(1, 'Toyota Corolla')]);
      dbSpy.getTrips.and.resolveTo([makeTrip(1, 'ทริปประจำวัน')]);

      const result = await service.getOverview('trip');

      expect(result.kmPerLiter).toBeUndefined();
      expect(result.groupRows[0].kmPerLiter).toBeUndefined();
    });

    it('computes avgPricePerLiter as Σamount ÷ Σliters (weighted by money, not average of pricePerLiter)', async () => {
      dbSpy.getEntries.and.resolveTo([
        makeEntry({ totalAmount: 1000, liters: 25, pricePerLiter: 40 }),
        makeEntry({ totalAmount: 400, liters: 20, pricePerLiter: 20 }),
      ]);
      dbSpy.getVehicles.and.resolveTo([]);
      dbSpy.getTrips.and.resolveTo([]);

      const result = await service.getOverview('trip');

      // Σamount=1400, Σliters=45 → 31.11, NOT (40+20)/2=30
      expect(result.avgPricePerLiter).toBeCloseTo(1400 / 45, 5);
    });
  });
});
