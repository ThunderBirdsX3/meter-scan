import { TestBed } from '@angular/core/testing';
import { FuelDataService } from './fuel-data.service';
import { DbService } from './db.service';

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

  it('getOverview() remains a stub and never touches DbService (FR-007/008 Non-goal)', async () => {
    const result = await service.getOverview('trip');

    expect(result.segmentKey).toBe('trip');
    expect(result.groupRows.length).toBeGreaterThan(0);
    expect(dbSpy.getEntries).not.toHaveBeenCalled();
  });
});
