import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { AddPage } from './add.page';
import { CameraService } from '../services/camera.service';
import { MeterOnnxService } from '../services/meter-onnx.service';
import { FuelDataService } from '../services/fuel-data.service';
import { Vehicle } from '../models/fuel-entry.model';

// Plan: 2026-07-03-2208-vehicle-fuel-autofill — Test Plan unit groups a-d + manual-change reset
describe('AddPage — vehicle → fuel-type auto-fill (not force)', () => {
  let dataSpy: jasmine.SpyObj<FuelDataService>;

  const vehicleWithDefault: Vehicle = {
    id: 1, name: 'Civic', licensePlate: 'กก 1111', fuelTypeId: 7, createdAt: new Date('2026-07-01'),
  };
  const vehicleWithoutDefault: Vehicle = {
    id: 2, name: 'Jazz', licensePlate: 'กก 2222', createdAt: new Date('2026-07-01'),
  };

  function setup(): AddPage {
    dataSpy = jasmine.createSpyObj<FuelDataService>('FuelDataService', [
      'getVehicles', 'getTrips', 'getBrands', 'getFuelTypes', 'getBrandFuels', 'addEntry',
    ]);
    dataSpy.getVehicles.and.resolveTo([vehicleWithDefault, vehicleWithoutDefault]);
    dataSpy.getTrips.and.resolveTo([]);
    dataSpy.getBrands.and.resolveTo([]);
    dataSpy.getFuelTypes.and.resolveTo([]);
    dataSpy.getBrandFuels.and.resolveTo([]);

    TestBed.configureTestingModule({
      declarations: [AddPage],
      imports: [FormsModule],   // template uses #entryForm="ngForm" + [(ngModel)] → NG0301 without this
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: CameraService, useValue: jasmine.createSpyObj('CameraService', ['takePhoto', 'pickFromGallery']) },
        { provide: MeterOnnxService, useValue: jasmine.createSpyObj('MeterOnnxService', ['warmUp', 'readField']) },
        { provide: FuelDataService, useValue: dataSpy },
      ],
    });

    const fixture = TestBed.createComponent(AddPage);
    const page = fixture.componentInstance;
    // Bypass loadPickerData()/ngOnInit — inject picker data directly to isolate the method under test.
    page.vehicles = [vehicleWithDefault, vehicleWithoutDefault];
    return page;
  }

  it('(a) fuelTypeId empty + vehicle has default → auto-fills and marks fuelTypeAutoFilled=true', () => {
    const page = setup();
    page.draft = { vehicleId: 1 };
    page.fuelTypeAutoFilled = false;

    page.onVehicleChange();

    expect(page.draft.fuelTypeId).toBe(7);
    expect(page.fuelTypeAutoFilled).toBeTrue();
  });

  it('(b) fuelTypeId already has a manual value (fuelTypeAutoFilled=false) → does NOT overwrite', () => {
    const page = setup();
    page.draft = { vehicleId: 1, fuelTypeId: 99 };
    page.fuelTypeAutoFilled = false;

    page.onVehicleChange();

    expect(page.draft.fuelTypeId).toBe(99);
    expect(page.fuelTypeAutoFilled).toBeFalse();
  });

  it('(c) current value came from a prior auto-fill, switching vehicle → updates to new vehicle default', () => {
    const page = setup();
    page.draft = { vehicleId: 1, fuelTypeId: 3 }; // stale auto value from a previously-selected vehicle
    page.fuelTypeAutoFilled = true;

    page.onVehicleChange();

    expect(page.draft.fuelTypeId).toBe(7);
    expect(page.fuelTypeAutoFilled).toBeTrue();
  });

  it('(d) vehicle has no default → keeps existing fuelTypeId untouched (no clear)', () => {
    const page = setup();
    page.draft = { vehicleId: 2, fuelTypeId: 5 };
    page.fuelTypeAutoFilled = false;

    page.onVehicleChange();

    expect(page.draft.fuelTypeId).toBe(5);
    expect(page.fuelTypeAutoFilled).toBeFalse();
  });

  it('onFuelTypeManualChange() sets fuelTypeAutoFilled=false so a later vehicle switch will not overwrite it', () => {
    const page = setup();
    page.fuelTypeAutoFilled = true;

    page.onFuelTypeManualChange();

    expect(page.fuelTypeAutoFilled).toBeFalse();
  });

  // Plan: 2026-07-04-1029-brand-logo-fuel-color-assets — brand_fuel join picker filter (step 8)
  describe('fuel picker — canonical catalog vs. brand-filtered offers (schema v2)', () => {
    it('no brand selected → fuelPickerOptions falls back to the full canonical catalog', () => {
      const page = setup();
      page.fuelTypes = [
        { id: 1, code: 'G95', label: 'แก๊สโซฮอล์ 95', sortOrder: 20 },
        { id: 2, code: 'DIESEL', label: 'ดีเซล', sortOrder: 70 },
      ];
      page.draft = { brandId: undefined };

      expect(page.fuelPickerOptions).toEqual([
        { id: 1, label: 'แก๊สโซฮอล์ 95' },
        { id: 2, label: 'ดีเซล' },
      ]);
    });

    it('onBrandChange() loads that brand\'s offers via getBrandFuels() — picker filters to them, label = marketingName || label', async () => {
      const page = setup();
      dataSpy.getBrandFuels.and.resolveTo([
        { brandId: 10, fuelTypeId: 2, code: 'DIESEL', label: 'ดีเซล', color: '#0072BB' },
        { brandId: 10, fuelTypeId: 3, code: 'DIESEL+', label: 'ดีเซลพรีเมียม', color: '#012872', marketingName: 'ไฮพรีเมียมดีเซล' },
      ]);
      page.draft = { brandId: 10 };

      await page.onBrandChange();

      expect(dataSpy.getBrandFuels).toHaveBeenCalledWith(10);
      expect(page.fuelPickerOptions).toEqual([
        { id: 2, label: 'ดีเซล', color: '#0072BB' },
        { id: 3, label: 'ไฮพรีเมียมดีเซล', color: '#012872' },
      ]);
    });

    it('onBrandChange() with no brand selected clears brandFuelOptions without calling getBrandFuels()', async () => {
      const page = setup();
      page.brandFuelOptions = [{ brandId: 10, fuelTypeId: 2, code: 'DIESEL', label: 'ดีเซล', color: '#0072BB' }];
      page.draft = { brandId: undefined };

      await page.onBrandChange();

      expect(dataSpy.getBrandFuels).not.toHaveBeenCalled();
      expect(page.brandFuelOptions).toEqual([]);
    });

    it('selectedFuelColor resolves the currently-picked offering\'s color (supplemental — plan DS Compliance)', async () => {
      const page = setup();
      dataSpy.getBrandFuels.and.resolveTo([
        { brandId: 10, fuelTypeId: 2, code: 'DIESEL', label: 'ดีเซล', color: '#0072BB' },
      ]);
      page.draft = { brandId: 10, fuelTypeId: 2 };

      await page.onBrandChange();

      expect(page.selectedFuelColor).toBe('#0072BB');
    });

    it('selectedFuelColor is undefined when the picked fuel has no color info (e.g. catalog-only, no brand)', () => {
      const page = setup();
      page.fuelTypes = [{ id: 5, code: 'LPG', label: 'LPG', sortOrder: 110 }];
      page.draft = { brandId: undefined, fuelTypeId: 5 };

      expect(page.selectedFuelColor).toBeUndefined();
    });
  });
});
