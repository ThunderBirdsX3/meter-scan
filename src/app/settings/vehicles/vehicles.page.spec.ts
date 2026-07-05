import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { VehiclesPage } from './vehicles.page';
import { FuelDataService } from '../../services/fuel-data.service';
import { FuelEntry, Vehicle } from '../../models/fuel-entry.model';

// Plan: 2026-07-03-2208-vehicle-fuel-autofill — delete-confirm entry count (FR-003 Post-condition)
describe('VehiclesPage — delete confirm entry count', () => {
  let dataSpy: jasmine.SpyObj<FuelDataService>;

  const vehicle: Vehicle = { id: 1, name: 'Civic', createdAt: new Date('2026-07-01') };

  function mkEntry(id: number): FuelEntry {
    return { id, datetime: new Date('2026-07-01'), createdAt: new Date('2026-07-01') };
  }

  function setup(entries: FuelEntry[]): VehiclesPage {
    dataSpy = jasmine.createSpyObj<FuelDataService>('FuelDataService', [
      'getVehicles', 'getFuelTypes', 'getEntries', 'deleteVehicle',
    ]);
    dataSpy.getVehicles.and.resolveTo([]);
    dataSpy.getFuelTypes.and.resolveTo([]);
    dataSpy.getEntries.and.resolveTo(entries);

    TestBed.configureTestingModule({
      declarations: [VehiclesPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [{ provide: FuelDataService, useValue: dataSpy }],
    });

    const fixture = TestBed.createComponent(VehiclesPage);
    return fixture.componentInstance;
  }

  it('N=3 impacted entries → getEntries queried by vehicleId, message shows the count, alert opens', async () => {
    const page = setup([mkEntry(1), mkEntry(2), mkEntry(3)]);

    await page.confirmDeleteVehicle(vehicle);

    expect(dataSpy.getEntries).toHaveBeenCalledWith({ vehicleId: 1 });
    expect(page.deleteVehicleMessage).toContain('3');
    expect(page.deleteVehicleAlertOpen).toBeTrue();
  });

  it('N=0 impacted entries → normal message (no count) shown', async () => {
    const page = setup([]);

    await page.confirmDeleteVehicle(vehicle);

    expect(page.deleteVehicleMessage).toBe('การดำเนินการนี้ไม่สามารถย้อนกลับได้');
  });

  it('reload() loads the canonical fuel_type catalog (schema v2 — brand-agnostic, no per-brand grouping)', async () => {
    dataSpy = jasmine.createSpyObj<FuelDataService>('FuelDataService', [
      'getVehicles', 'getFuelTypes', 'getEntries', 'deleteVehicle',
    ]);
    dataSpy.getVehicles.and.resolveTo([]);
    dataSpy.getFuelTypes.and.resolveTo([
      { id: 1, code: 'G95', label: 'แก๊สโซฮอล์ 95', sortOrder: 20 },
      { id: 2, code: 'DIESEL', label: 'ดีเซล', sortOrder: 70 },
    ]);
    dataSpy.getEntries.and.resolveTo([]);

    TestBed.configureTestingModule({
      declarations: [VehiclesPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [{ provide: FuelDataService, useValue: dataSpy }],
    });
    const page = TestBed.createComponent(VehiclesPage).componentInstance;

    await page.ngOnInit();

    expect(page.fuelTypes.length).toBe(2);
    expect(page.fuelTypes[0].label).toBe('แก๊สโซฮอล์ 95');
  });
});

// Plan: 2026-07-05-1930-vehicle-type-icons — iconFor() list-icon resolution + chip selection
describe('VehiclesPage — vehicle type icon (iconFor / selectVehicleType)', () => {
  function setup(): VehiclesPage {
    const dataSpy = jasmine.createSpyObj<FuelDataService>('FuelDataService', [
      'getVehicles', 'getFuelTypes', 'getEntries', 'deleteVehicle',
    ]);
    dataSpy.getVehicles.and.resolveTo([]);
    dataSpy.getFuelTypes.and.resolveTo([]);
    dataSpy.getEntries.and.resolveTo([]);

    TestBed.configureTestingModule({
      declarations: [VehiclesPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [{ provide: FuelDataService, useValue: dataSpy }],
    });

    return TestBed.createComponent(VehiclesPage).componentInstance;
  }

  it('iconFor(v) returns the matching asset path when vehicleType is set', () => {
    const page = setup();
    const v: Vehicle = { id: 1, name: 'Fortuner', vehicleType: 'ppv', createdAt: new Date('2026-07-01') };
    expect(page.iconFor(v)).toBe('assets/vehicle-icons/ppv.svg');
  });

  it('iconFor(v) returns null when vehicleType is unset (no icon shown in list)', () => {
    const page = setup();
    const v: Vehicle = { id: 2, name: 'Civic', createdAt: new Date('2026-07-01') };
    expect(page.iconFor(v)).toBeNull();
  });

  it('iconFor(v) returns null for an unknown/stale vehicleType code', () => {
    const page = setup();
    const v: Vehicle = { id: 3, name: 'Old', vehicleType: 'unknown-code', createdAt: new Date('2026-07-01') };
    expect(page.iconFor(v)).toBeNull();
  });

  it('selectVehicleType(code) sets vehicleDraft.vehicleType; selectVehicleType(null) clears it ("ไม่แสดงไอคอน")', () => {
    const page = setup();
    page.vehicleDraft = {};

    page.selectVehicleType('sedan');
    expect(page.vehicleDraft.vehicleType).toBe('sedan');

    page.selectVehicleType(null);
    expect(page.vehicleDraft.vehicleType).toBeUndefined();
  });
});
