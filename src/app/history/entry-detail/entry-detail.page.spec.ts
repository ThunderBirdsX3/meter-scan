import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';

import { EntryDetailPage } from './entry-detail.page';
import { FuelDataService } from '../../services/fuel-data.service';
import { Brand, FuelEntry, FuelType } from '../../models/fuel-entry.model';

describe('EntryDetailPage', () => {
  let dataSpy: jasmine.SpyObj<FuelDataService>;

  const entry: FuelEntry = {
    id: 42,
    vehicleId: 1,
    brandId: 3,
    fuelTypeId: 7,
    datetime: new Date('2026-07-01T09:00:00.000Z'),
    createdAt: new Date('2026-07-01T09:00:00.000Z'),
  };

  const hiddenBrand: Brand = { id: 3, name: 'อดีตแบรนด์', deletedAt: new Date('2026-06-01T00:00:00.000Z') };
  const hiddenFuelType: FuelType = { id: 7, code: 'DIESEL', label: 'ประเภทที่ถูกซ่อน', deletedAt: new Date('2026-06-01T00:00:00.000Z') };

  function setup(idParam: string | null) {
    dataSpy = jasmine.createSpyObj<FuelDataService>('FuelDataService', [
      'getEntry', 'getVehicles', 'getTrips', 'getBrandById', 'getFuelTypeById', 'deleteEntry',
    ]);
    dataSpy.getEntry.and.resolveTo(entry);
    dataSpy.getVehicles.and.resolveTo([]);
    dataSpy.getTrips.and.resolveTo([]);
    dataSpy.getBrandById.and.resolveTo(hiddenBrand);
    dataSpy.getFuelTypeById.and.resolveTo(hiddenFuelType);

    TestBed.configureTestingModule({
      declarations: [EntryDetailPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: FuelDataService, useValue: dataSpy },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(idParam !== null ? { id: idParam } : {}) } },
        },
      ],
    });

    const fixture = TestBed.createComponent(EntryDetailPage);
    return fixture.componentInstance;
  }

  it('converts the route id param (string) to a number before calling getEntry (id ripple)', async () => {
    const page = setup('42');
    await page.ngOnInit();

    expect(dataSpy.getEntry).toHaveBeenCalledWith(42);
    expect(typeof (dataSpy.getEntry.calls.mostRecent().args[0])).toBe('number');
  });

  it('does nothing (no throw) when the id param is missing or not numeric', async () => {
    const page = setup(null);
    await expectAsync(page.ngOnInit()).toBeResolved();
    expect(dataSpy.getEntry).not.toHaveBeenCalled();
  });

  it('resolves brand/fuel type name via UNFILTERED getBrandById/getFuelTypeById so a soft-hidden row still shows (SRS FR-005 AC#4)', async () => {
    const page = setup('42');
    await page.ngOnInit();

    expect(dataSpy.getBrandById).toHaveBeenCalledWith(3);
    expect(dataSpy.getFuelTypeById).toHaveBeenCalledWith(7);
    expect(page.brandName).toBe('อดีตแบรนด์');
    expect(page.fuelTypeName).toBe('ประเภทที่ถูกซ่อน');
  });
});
