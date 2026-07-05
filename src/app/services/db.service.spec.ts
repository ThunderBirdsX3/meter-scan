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

  describe('native init + migration (v0 -> v2 staircase)', () => {
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

    it('runs the v1 DDL in a transaction and bumps user_version to 1 as the first staircase step', () => {
      const ddlCall = fakeConn.execute.calls.allArgs().find(args => String(args[0]).includes('CREATE TABLE'));
      expect(ddlCall).toBeDefined();
      expect(ddlCall?.[1]).toBe(true); // transactional

      expect(fakeConn.execute).toHaveBeenCalledWith('PRAGMA user_version = 1;', false);
    });

    it('v1->v2 migration: drops the old per-brand fuel_type and creates the canonical catalog + brand_fuel, toggling PRAGMA foreign_keys OUTSIDE the transaction (plan step 3)', () => {
      const allArgs = fakeConn.execute.calls.allArgs();
      const migrationCall = allArgs.find(args => String(args[0]).includes('DROP TABLE fuel_type'));
      expect(migrationCall).toBeDefined();
      expect(String(migrationCall?.[0])).toContain('CREATE TABLE brand_fuel');
      expect(migrationCall?.[1]).toBe(true); // transactional

      const offIdx = allArgs.findIndex(args => args[0] === 'PRAGMA foreign_keys = OFF;');
      const migrationIdx = allArgs.findIndex(args => String(args[0]).includes('DROP TABLE fuel_type'));
      const onIdx = allArgs.findIndex(args => args[0] === 'PRAGMA foreign_keys = ON;' && allArgs.indexOf(args) > migrationIdx);
      expect(offIdx).toBeGreaterThan(-1);
      expect(offIdx).toBeLessThan(migrationIdx);
      expect(onIdx).toBeGreaterThan(migrationIdx);

      expect(fakeConn.execute).toHaveBeenCalledWith('PRAGMA user_version = 2;', false);
    });

    it('v1->v2 migration nulls existing fuel_entry/vehicle fuel refs (accepted — plan Risk R2, pre-release wipe)', () => {
      const migrationCall = fakeConn.execute.calls.allArgs().find(args => String(args[0]).includes('DROP TABLE fuel_type'));
      const sql = String(migrationCall?.[0]);
      expect(sql).toContain('UPDATE fuel_entry SET fuel_type_id = NULL');
      expect(sql).toContain('UPDATE vehicle SET default_fuel_type_id = NULL');
    });

    it('v2->v3 migration: ALTER TABLE vehicle ADD COLUMN vehicle_type, landing on user_version 3 (plan 2026-07-05-1930-vehicle-type-icons, Risk R1)', () => {
      const allArgs = fakeConn.execute.calls.allArgs();
      const alterCall = allArgs.find(args => String(args[0]).includes('ALTER TABLE vehicle ADD COLUMN vehicle_type'));
      expect(alterCall).toBeDefined();
      expect(alterCall?.[1]).toBe(true); // transactional — plain ADD COLUMN is safe, no FK toggle needed

      expect(fakeConn.execute).toHaveBeenCalledWith('PRAGMA user_version = 3;', false);
    });

    it('getBrands()/getFuelTypes() filter soft-hidden rows (deleted_at IS NULL)', async () => {
      fakeConn.query.calls.reset();
      fakeConn.query.and.resolveTo({ values: [] });

      await service.getBrands();
      expect(fakeConn.query.calls.mostRecent().args[0]).toContain('deleted_at IS NULL');

      await service.getFuelTypes();
      expect(fakeConn.query.calls.mostRecent().args[0]).toContain('deleted_at IS NULL');
    });

    it('getFuelTypes() orders by sort_order and maps the canonical shape (code/label/sortOrder — no legacy brandId/grade/color)', async () => {
      fakeConn.query.calls.reset();
      fakeConn.query.and.resolveTo({
        values: [{ id: 1, code: 'G95', label: 'แก๊สโซฮอล์ 95', sort_order: 20, deleted_at: null, created_at: '2026-01-01T00:00:00.000Z' }],
      });

      const [ft] = await service.getFuelTypes();

      expect(fakeConn.query.calls.mostRecent().args[0]).toContain('ORDER BY sort_order');
      expect(ft).toEqual(jasmine.objectContaining({ id: 1, code: 'G95', label: 'แก๊สโซฮอล์ 95', sortOrder: 20 }));
      expect((ft as unknown as { name?: string }).name).toBeUndefined();
      expect((ft as unknown as { brandId?: number }).brandId).toBeUndefined();
    });

    it('getBrandById()/getFuelTypeById() do NOT filter soft-hidden rows (SRS FR-005 AC#4)', async () => {
      fakeConn.query.calls.reset();
      fakeConn.query.and.resolveTo({ values: [{ id: 1, name: 'PTT', logo_asset: null, deleted_at: '2026-07-01T00:00:00.000Z', created_at: '2026-01-01T00:00:00.000Z' }] });

      const brand = await service.getBrandById(1);
      expect(fakeConn.query.calls.mostRecent().args[0]).not.toContain('deleted_at IS NULL');
      expect(brand?.name).toBe('PTT');
      expect(brand?.deletedAt).toBeInstanceOf(Date);
    });

    it('getBrandFuels(brandId) joins brand_fuel + fuel_type filtered by brand, excluding soft-hidden rows on both sides', async () => {
      fakeConn.query.calls.reset();
      fakeConn.query.and.resolveTo({
        values: [
          { brand_id: 1, fuel_type_id: 10, code: 'DIESEL', label: 'ดีเซล', color: '#0072BB', marketing_name: null },
          { brand_id: 1, fuel_type_id: 11, code: 'G95', label: 'แก๊สโซฮอล์ 95', color: '#C44F0D', marketing_name: null },
        ],
      });

      const offers = await service.getBrandFuels(1);

      const [sql, values] = fakeConn.query.calls.mostRecent().args;
      expect(sql).toContain('brand_fuel');
      expect(sql).toContain('JOIN fuel_type');
      expect(sql).toContain('bf.brand_id = ?');
      expect(sql).toContain('bf.deleted_at IS NULL');
      expect(sql).toContain('ft.deleted_at IS NULL');
      expect(values).toEqual([1]);
      expect(offers.length).toBe(2);
      expect(offers[0]).toEqual({ brandId: 1, fuelTypeId: 10, code: 'DIESEL', label: 'ดีเซล', color: '#0072BB', marketingName: undefined });
    });

    it('getAllBrandFuels() returns the full join unfiltered by brand, ordered by brand then sort_order (master-data grid source)', async () => {
      fakeConn.query.calls.reset();
      fakeConn.query.and.resolveTo({ values: [] });

      await service.getAllBrandFuels();

      const [sql, values] = fakeConn.query.calls.mostRecent().args;
      expect(sql).not.toContain('bf.brand_id = ?');
      expect(sql).toContain('ORDER BY bf.brand_id, ft.sort_order');
      expect(values).toBeUndefined();
    });

    it('getFuelColor(brandId, fuelTypeId) resolves the hex from brand_fuel, or null when no matching row', async () => {
      fakeConn.query.calls.reset();
      fakeConn.query.and.resolveTo({ values: [{ color: '#0072BB' }] });
      expect(await service.getFuelColor(1, 10)).toBe('#0072BB');

      fakeConn.query.and.resolveTo({ values: [] });
      expect(await service.getFuelColor(1, 999)).toBeNull();
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
        values: [{ id: 5, name: 'Civic', plate: 'กข 1234', default_fuel_type_id: 2, vehicle_type: null, created_at: '2026-01-01T00:00:00.000Z' }],
      });
      const [vehicle] = await service.getVehicles();
      expect(vehicle.licensePlate).toBe('กข 1234');
      expect(vehicle.fuelTypeId).toBe(2);
    });

    it('addVehicle() writes vehicle_type and the round-tripped vehicle carries vehicleType back (schema v3 — plan 2026-07-05-1930-vehicle-type-icons)', async () => {
      fakeConn.run.and.resolveTo({ changes: { changes: 1, lastId: 9 } });
      fakeConn.query.and.resolveTo({
        values: [{ id: 9, name: 'Fortuner', plate: null, default_fuel_type_id: null, vehicle_type: 'ppv', created_at: '2026-07-05T00:00:00.000Z' }],
      });

      const created = await service.addVehicle({ name: 'Fortuner', vehicleType: 'ppv' });

      const insertCall = fakeConn.run.calls.first();
      expect(insertCall.args[0]).toContain('vehicle_type');
      expect(insertCall.args[1]).toEqual(['Fortuner', null, null, 'ppv']);
      expect(created.vehicleType).toBe('ppv');
    });

    it('updateVehicle() changes vehicle_type via UPDATE', async () => {
      fakeConn.query.and.resolveTo({
        values: [{ id: 9, name: 'Fortuner', plate: null, default_fuel_type_id: null, vehicle_type: 'suv', created_at: '2026-07-05T00:00:00.000Z' }],
      });

      const updated = await service.updateVehicle(9, { vehicleType: 'suv' });

      const updateCall = fakeConn.run.calls.mostRecent();
      expect(updateCall.args[0]).toContain('vehicle_type = ?');
      expect(updateCall.args[1]).toEqual(['suv', 9]);
      expect(updated.vehicleType).toBe('suv');
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

    it('seedInsertFuelType(code,label,sortOrder) inserts into the canonical catalog table', async () => {
      fakeConn.run.calls.reset();
      fakeConn.run.and.resolveTo({ changes: { changes: 1, lastId: 10 } });

      await service.seedInsertFuelType('DIESEL', 'ดีเซล', 70, false);

      const call = fakeConn.run.calls.mostRecent();
      expect(call.args[0]).toContain('INSERT INTO fuel_type (code, label, sort_order)');
      expect(call.args[1]).toEqual(['DIESEL', 'ดีเซล', 70]);
      expect(call.args[2]).toBe(false);
    });

    it('seedInsertBrandFuel(brandId,fuelTypeId,color,marketingName) inserts into brand_fuel', async () => {
      fakeConn.run.calls.reset();
      fakeConn.run.and.resolveTo({ changes: { changes: 1, lastId: 55 } });

      await service.seedInsertBrandFuel(1, 10, '#0072BB', undefined, false);

      const call = fakeConn.run.calls.mostRecent();
      expect(call.args[0]).toContain('INSERT INTO brand_fuel (brand_id, fuel_type_id, color, marketing_name)');
      expect(call.args[1]).toEqual([1, 10, '#0072BB', null]);
      expect(call.args[2]).toBe(false);
    });

    it('clearMasterDataForReseed() deletes brand_fuel, fuel_type, brand in that dependency order, honoring the transaction flag', async () => {
      fakeConn.execute.calls.reset();

      await service.clearMasterDataForReseed(false);

      const call = fakeConn.execute.calls.mostRecent();
      const sql = String(call.args[0]);
      expect(sql.indexOf('DELETE FROM brand_fuel')).toBeLessThan(sql.indexOf('DELETE FROM fuel_type'));
      expect(sql.indexOf('DELETE FROM fuel_type')).toBeLessThan(sql.indexOf('DELETE FROM brand;'));
      expect(call.args[1]).toBe(false);
    });
  });

  describe('existing v1 database migrates directly to v2 (no re-run of the v0->v1 DDL)', () => {
    let fakeConn: ReturnType<typeof makeFakeConn>;

    beforeEach(async () => {
      spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
      fakeConn = makeFakeConn();
      fakeConn.query.and.resolveTo({ values: [{ user_version: 1 }] });
      spyOn(SQLiteConnection.prototype, 'createConnection').and.resolveTo(fakeConn as unknown as never);
      await service.init();
    });

    it('does not re-run the base v0->v1 DDL, but does apply the v1->v2 catalog+join migration and lands on user_version 2', () => {
      const allArgs = fakeConn.execute.calls.allArgs();
      const baseDdlCall = allArgs.find(args => String(args[0]).includes('CREATE TABLE IF NOT EXISTS brand'));
      expect(baseDdlCall).toBeUndefined();

      const migrationCall = allArgs.find(args => String(args[0]).includes('DROP TABLE fuel_type'));
      expect(migrationCall).toBeDefined();

      expect(fakeConn.execute).not.toHaveBeenCalledWith('PRAGMA user_version = 1;', false);
      expect(fakeConn.execute).toHaveBeenCalledWith('PRAGMA user_version = 2;', false);
    });
  });

  describe('existing v2 database migrates to v3 (plan 2026-07-05-1930-vehicle-type-icons)', () => {
    let fakeConn: ReturnType<typeof makeFakeConn>;

    beforeEach(async () => {
      spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
      fakeConn = makeFakeConn();
      fakeConn.query.and.resolveTo({ values: [{ user_version: 2 }] });
      spyOn(SQLiteConnection.prototype, 'createConnection').and.resolveTo(fakeConn as unknown as never);
      await service.init();
    });

    it('does not re-run earlier migrations, only adds the vehicle_type column and lands on user_version 3', () => {
      const allArgs = fakeConn.execute.calls.allArgs();
      const baseDdlCall = allArgs.find(args => String(args[0]).includes('CREATE TABLE IF NOT EXISTS brand'));
      expect(baseDdlCall).toBeUndefined();

      const v1v2Call = allArgs.find(args => String(args[0]).includes('DROP TABLE fuel_type'));
      expect(v1v2Call).toBeUndefined();

      const alterCall = allArgs.find(args => String(args[0]).includes('ALTER TABLE vehicle ADD COLUMN vehicle_type'));
      expect(alterCall).toBeDefined();
      expect(alterCall?.[1]).toBe(true);

      expect(fakeConn.execute).not.toHaveBeenCalledWith('PRAGMA user_version = 2;', false);
      expect(fakeConn.execute).toHaveBeenCalledWith('PRAGMA user_version = 3;', false);
    });
  });
});
