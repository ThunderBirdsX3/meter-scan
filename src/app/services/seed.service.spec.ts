import { TestBed } from '@angular/core/testing';
import { SeedService } from './seed.service';
import { DbService } from './db.service';
import { CANONICAL_FUEL_TYPES, SEED_BRANDS, SEED_CONFIG_VERSION } from './seed-data';

describe('SeedService (schema v2 — canonical catalog + brand_fuel join)', () => {
  let service: SeedService;
  let dbSpy: jasmine.SpyObj<DbService>;

  beforeEach(() => {
    dbSpy = jasmine.createSpyObj<DbService>('DbService', [
      'getMetaValue', 'setMetaValue', 'seedInsertBrand', 'seedInsertFuelType', 'seedInsertBrandFuel',
      'clearMasterDataForReseed', 'beginSeedTransaction', 'commitSeedTransaction', 'rollbackSeedTransaction',
    ]);

    TestBed.configureTestingModule({
      providers: [{ provide: DbService, useValue: dbSpy }],
    });
    service = TestBed.inject(SeedService);
  });

  it('skips seeding entirely when meta.seed_config_version already matches (FR-011 AC#2 idempotent)', async () => {
    dbSpy.getMetaValue.and.resolveTo(SEED_CONFIG_VERSION);

    await service.seedIfNeeded();

    expect(dbSpy.beginSeedTransaction).not.toHaveBeenCalled();
    expect(dbSpy.seedInsertFuelType).not.toHaveBeenCalled();
    expect(dbSpy.seedInsertBrand).not.toHaveBeenCalled();
  });

  it('SEED_CONFIG_VERSION is bumped to "2" for the normalized catalog+join model', () => {
    expect(SEED_CONFIG_VERSION).toBe('2');
  });

  it('CANONICAL_FUEL_TYPES has exactly the 11 flag codes from the plan Seed map', () => {
    expect(CANONICAL_FUEL_TYPES.length).toBe(11);
    const codes = CANONICAL_FUEL_TYPES.map(ft => ft.code);
    expect(codes).toEqual(['G91', 'G95', 'G95+', 'E20', 'E85', 'B95', 'DIESEL', 'DIESEL+', 'B20', 'NGV', 'LPG']);
  });

  it('SEED_BRANDS has exactly 8 brands — Esso/Mobil, Sinopec, and "อื่นๆ (Other)" are absent', () => {
    expect(SEED_BRANDS.length).toBe(8);
    const names = SEED_BRANDS.map(b => b.name).join(' | ');
    expect(names).not.toMatch(/Esso|Mobil|Sinopec|อื่นๆ/);
  });

  describe('fresh install (no prior seed row)', () => {
    beforeEach(() => {
      dbSpy.getMetaValue.and.resolveTo(null);
      let nextId = 100;
      dbSpy.seedInsertFuelType.and.callFake(() => Promise.resolve(nextId++));
      dbSpy.seedInsertBrand.and.callFake(() => Promise.resolve(nextId++));
      dbSpy.seedInsertBrandFuel.and.callFake(() => Promise.resolve(nextId++));
    });

    it('does NOT wipe (nothing to wipe) — inserts the 11-code catalog, then 8 brands, then every brand_fuel offer, then commits (FR-011 AC#1)', async () => {
      await service.seedIfNeeded();

      expect(dbSpy.clearMasterDataForReseed).not.toHaveBeenCalled();
      expect(dbSpy.beginSeedTransaction).toHaveBeenCalledBefore(dbSpy.seedInsertFuelType as jasmine.Spy);
      expect(dbSpy.seedInsertFuelType).toHaveBeenCalledTimes(CANONICAL_FUEL_TYPES.length);
      expect(dbSpy.seedInsertBrand).toHaveBeenCalledTimes(SEED_BRANDS.length);

      const expectedOfferCount = SEED_BRANDS.reduce((sum, b) => sum + b.offers.length, 0);
      expect(dbSpy.seedInsertBrandFuel).toHaveBeenCalledTimes(expectedOfferCount);

      // All inserts inside the seed batch run OUTSIDE their own auto-transaction (transaction=false)
      // — they participate in the single explicit begin/commit instead.
      for (const args of dbSpy.seedInsertFuelType.calls.allArgs()) expect(args[3]).toBe(false);
      for (const args of dbSpy.seedInsertBrand.calls.allArgs()) expect(args[2]).toBe(false);
      for (const args of dbSpy.seedInsertBrandFuel.calls.allArgs()) expect(args[4]).toBe(false);

      expect(dbSpy.setMetaValue).toHaveBeenCalledWith('seed_config_version', SEED_CONFIG_VERSION, false);
      expect(dbSpy.commitSeedTransaction).toHaveBeenCalled();
      expect(dbSpy.rollbackSeedTransaction).not.toHaveBeenCalled();
    });

    it('inserts a sample real color exactly as in the plan Seed map (PTT DIESEL = #0072BB)', async () => {
      await service.seedIfNeeded();

      const pttDieselCall = dbSpy.seedInsertBrandFuel.calls.allArgs().find(args => args[2] === '#0072BB');
      expect(pttDieselCall).toBeDefined();
    });
  });

  describe('reseed on version mismatch (dev reset — plan Decision #5 / Risk R2)', () => {
    it('a prior seed row exists at an older version → clearMasterDataForReseed() runs BEFORE any insert, then reseeds clean (no duplicate rows)', async () => {
      dbSpy.getMetaValue.and.resolveTo('1'); // legacy per-brand v1 seed
      let nextId = 200;
      dbSpy.seedInsertFuelType.and.callFake(() => Promise.resolve(nextId++));
      dbSpy.seedInsertBrand.and.callFake(() => Promise.resolve(nextId++));
      dbSpy.seedInsertBrandFuel.and.callFake(() => Promise.resolve(nextId++));

      await service.seedIfNeeded();

      expect(dbSpy.clearMasterDataForReseed).toHaveBeenCalledWith(false);
      expect(dbSpy.clearMasterDataForReseed).toHaveBeenCalledBefore(dbSpy.seedInsertFuelType as jasmine.Spy);
      expect(dbSpy.seedInsertFuelType).toHaveBeenCalledTimes(CANONICAL_FUEL_TYPES.length);
      expect(dbSpy.seedInsertBrand).toHaveBeenCalledTimes(SEED_BRANDS.length);
      expect(dbSpy.commitSeedTransaction).toHaveBeenCalled();
    });
  });

  it('rolls back the whole batch and rethrows if any insert fails mid-seed (FR-011 error handling)', async () => {
    dbSpy.getMetaValue.and.resolveTo(null);
    dbSpy.seedInsertFuelType.and.resolveTo(1);
    dbSpy.seedInsertBrand.and.resolveTo(1);
    dbSpy.seedInsertBrandFuel.and.rejectWith(new Error('DB_WRITE: disk full'));

    await expectAsync(service.seedIfNeeded()).toBeRejectedWithError(/disk full/);

    expect(dbSpy.rollbackSeedTransaction).toHaveBeenCalled();
    expect(dbSpy.commitSeedTransaction).not.toHaveBeenCalled();
    expect(dbSpy.setMetaValue).not.toHaveBeenCalled();
  });
});
