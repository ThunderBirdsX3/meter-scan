import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';
import { SQLiteConnection } from '@capacitor-community/sqlite';
import { DbService } from './db.service';

/** Minimal fake of SQLiteDBConnection — only the methods DbService actually calls. */
function makeFakeConn() {
  return {
    open: jasmine.createSpy('open').and.resolveTo(),
    execute: jasmine.createSpy('execute').and.resolveTo({ changes: { changes: 0 } }),
    query: jasmine.createSpy('query').and.resolveTo({ values: [] }),
    run: jasmine.createSpy('run').and.resolveTo({ changes: { changes: 1, lastId: 1 } }),
  };
}

describe('DbService', () => {
  let service: DbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DbService);
  });

  describe('init() — DB_INIT (FR-010 error handling)', () => {
    it('rejects with a DB_INIT message on non-native platforms (web/PWA out of scope)', async () => {
      spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
      await expectAsync(service.init()).toBeRejectedWithError(/DB_INIT/);
    });

    it('allows a retry after a failed init (does not cache the rejected promise forever)', async () => {
      spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
      await expectAsync(service.init()).toBeRejected();
      // Second call must re-attempt doInit() rather than replay a cached rejection silently hanging.
      await expectAsync(service.init()).toBeRejected();
    });
  });

  describe('native init + migration (v0 -> v1)', () => {
    let fakeConn: ReturnType<typeof makeFakeConn>;

    beforeEach(async () => {
      spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
      fakeConn = makeFakeConn();
      fakeConn.query.and.resolveTo({ values: [{ user_version: 0 }] });
      spyOn(SQLiteConnection.prototype, 'createConnection').and.resolveTo(fakeConn as unknown as never);
      await service.init();
    });

    it('opens the connection and enables foreign keys', () => {
      expect(fakeConn.open).toHaveBeenCalled();
      expect(fakeConn.execute).toHaveBeenCalledWith('PRAGMA foreign_keys = ON;', false);
    });

    it('runs the v1 DDL in a transaction and bumps user_version when starting from version 0', () => {
      const ddlCall = fakeConn.execute.calls.allArgs().find(args => String(args[0]).includes('CREATE TABLE'));
      expect(ddlCall).toBeDefined();
      expect(ddlCall?.[1]).toBe(true); // transactional

      expect(fakeConn.execute).toHaveBeenCalledWith('PRAGMA user_version = 1;', false);
    });

    it('getBrands()/getFuelTypes() filter soft-hidden rows (deleted_at IS NULL)', async () => {
      fakeConn.query.calls.reset();
      fakeConn.query.and.resolveTo({ values: [] });

      await service.getBrands();
      expect(fakeConn.query.calls.mostRecent().args[0]).toContain('deleted_at IS NULL');

      await service.getFuelTypes();
      expect(fakeConn.query.calls.mostRecent().args[0]).toContain('deleted_at IS NULL');
    });

    it('getBrandById()/getFuelTypeById() do NOT filter soft-hidden rows (SRS FR-005 AC#4)', async () => {
      fakeConn.query.calls.reset();
      fakeConn.query.and.resolveTo({ values: [{ id: 1, name: 'PTT', logo_asset: null, deleted_at: '2026-07-01T00:00:00.000Z', created_at: '2026-01-01T00:00:00.000Z' }] });

      const brand = await service.getBrandById(1);
      expect(fakeConn.query.calls.mostRecent().args[0]).not.toContain('deleted_at IS NULL');
      expect(brand?.name).toBe('PTT');
      expect(brand?.deletedAt).toBeInstanceOf(Date);
    });

    it('softDeleteBrand()/softDeleteFuelType() set deleted_at via UPDATE', async () => {
      await service.softDeleteBrand(3);
      let call = fakeConn.run.calls.mostRecent();
      expect(call.args[0]).toContain('UPDATE brand SET deleted_at = ?');
      expect(call.args[1][1]).toBe(3);

      await service.softDeleteFuelType(7);
      call = fakeConn.run.calls.mostRecent();
      expect(call.args[0]).toContain('UPDATE fuel_type SET deleted_at = ?');
      expect(call.args[1][1]).toBe(7);
    });

    it('rowToVehicle() maps DDL column names (plate/default_fuel_type_id) to model field names', async () => {
      fakeConn.query.and.resolveTo({
        values: [{ id: 5, name: 'Civic', plate: 'กข 1234', default_fuel_type_id: 2, created_at: '2026-01-01T00:00:00.000Z' }],
      });
      const [vehicle] = await service.getVehicles();
      expect(vehicle.licensePlate).toBe('กข 1234');
      expect(vehicle.fuelTypeId).toBe(2);
    });

    it('addEntry() defaults missing liters/price/amount to 0 to satisfy DDL NOT NULL columns', async () => {
      fakeConn.run.and.resolveTo({ changes: { changes: 1, lastId: 42 } });
      fakeConn.query.and.resolveTo({
        values: [{
          id: 42, datetime: '2026-07-02T00:00:00.000Z', vehicle_id: null, trip_id: null, brand_id: null, fuel_type_id: null,
          liters: 0, price_per_liter: 0, amount: 500, odometer_km: null, station: null, note: null, image_uri: null,
          created_at: '2026-07-02T00:00:00.000Z',
        }],
      });

      await service.addEntry({ datetime: new Date('2026-07-02T00:00:00.000Z'), totalAmount: 500 });

      const insertCall = fakeConn.run.calls.first();
      const values = insertCall.args[1] as unknown[];
      // liters, price_per_liter default to 0; amount = 500 (as given)
      expect(values[5]).toBe(0);
      expect(values[6]).toBe(0);
      expect(values[7]).toBe(500);
    });

    it('getEntries(filter) builds a WHERE clause with the given vehicleId/tripId', async () => {
      fakeConn.query.calls.reset();
      fakeConn.query.and.resolveTo({ values: [] });
      await service.getEntries({ vehicleId: 9, tripId: 4 });
      const [sql, values] = fakeConn.query.calls.mostRecent().args;
      expect(sql).toContain('vehicle_id = ?');
      expect(sql).toContain('trip_id = ?');
      expect(values).toEqual([9, 4]);
    });
  });
});
