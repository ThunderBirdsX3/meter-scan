import { TestBed } from '@angular/core/testing';
import { SeedService } from './seed.service';
import { DbService } from './db.service';
import { SEED_BRANDS, SEED_CONFIG_VERSION } from './seed-data';

describe('SeedService', () => {
  let service: SeedService;
  let dbSpy: jasmine.SpyObj<DbService>;

  beforeEach(() => {
    dbSpy = jasmine.createSpyObj<DbService>('DbService', [
      'getMetaValue', 'setMetaValue', 'seedInsertBrand', 'seedInsertFuelType',
      'beginSeedTransaction', 'commitSeedTransaction', 'rollbackSeedTransaction',
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
    expect(dbSpy.seedInsertBrand).not.toHaveBeenCalled();
  });

  it('seeds every brand + fuel type inside one transaction, then commits + sets the version guard (FR-011 AC#1)', async () => {
    dbSpy.getMetaValue.and.resolveTo(null);
    let nextId = 100;
    dbSpy.seedInsertBrand.and.callFake(() => Promise.resolve(nextId++));
    dbSpy.seedInsertFuelType.and.callFake(() => Promise.resolve(nextId++));

    await service.seedIfNeeded();

    expect(dbSpy.beginSeedTransaction).toHaveBeenCalledBefore(dbSpy.seedInsertBrand as jasmine.Spy);
    expect(dbSpy.seedInsertBrand).toHaveBeenCalledTimes(SEED_BRANDS.length);

    const expectedFuelTypeCount = SEED_BRANDS.reduce((sum, b) => sum + b.fuelTypes.length, 0);
    expect(dbSpy.seedInsertFuelType).toHaveBeenCalledTimes(expectedFuelTypeCount);

    // All inserts inside the seed batch run OUTSIDE their own auto-transaction (transaction=false)
    // — they participate in the single explicit begin/commit instead.
    for (const args of dbSpy.seedInsertBrand.calls.allArgs()) {
      expect(args[2]).toBe(false);
    }
    for (const args of dbSpy.seedInsertFuelType.calls.allArgs()) {
      expect(args[4]).toBe(false);
    }

    expect(dbSpy.setMetaValue).toHaveBeenCalledWith('seed_config_version', SEED_CONFIG_VERSION, false);
    expect(dbSpy.commitSeedTransaction).toHaveBeenCalled();
    expect(dbSpy.rollbackSeedTransaction).not.toHaveBeenCalled();
  });

  it('rolls back the whole batch and rethrows if any insert fails mid-seed (FR-011 error handling)', async () => {
    dbSpy.getMetaValue.and.resolveTo(null);
    dbSpy.seedInsertBrand.and.resolveTo(1);
    dbSpy.seedInsertFuelType.and.rejectWith(new Error('DB_WRITE: disk full'));

    await expectAsync(service.seedIfNeeded()).toBeRejectedWithError(/disk full/);

    expect(dbSpy.rollbackSeedTransaction).toHaveBeenCalled();
    expect(dbSpy.commitSeedTransaction).not.toHaveBeenCalled();
    expect(dbSpy.setMetaValue).not.toHaveBeenCalled();
  });
});
