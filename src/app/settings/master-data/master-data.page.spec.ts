import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MasterDataPage } from './master-data.page';
import { FuelDataService } from '../../services/fuel-data.service';
import { Brand, BrandFuelOption, FuelType } from '../../models/fuel-entry.model';

// Plan: 2026-07-04-1029-brand-logo-fuel-color-assets — master-data page renders the brand_fuel
// join grid (per-brand offers + color) plus the brand-agnostic canonical catalog (step 9).
describe('MasterDataPage — canonical catalog + brand_fuel grid (schema v2, read-only FR-005)', () => {
  let dataSpy: jasmine.SpyObj<FuelDataService>;

  const ptt: Brand = { id: 1, name: 'PTT', logoAsset: 'assets/brand-logos/ptt.ico' };
  const shell: Brand = { id: 2, name: 'Shell', logoAsset: 'assets/brand-logos/shell.ico' };

  const catalog: FuelType[] = [
    { id: 10, code: 'G95', label: 'แก๊สโซฮอล์ 95', sortOrder: 20 },
    { id: 11, code: 'DIESEL', label: 'ดีเซล', sortOrder: 70 },
    { id: 12, code: 'LPG', label: 'LPG', sortOrder: 110 }, // catalog-only — no brand offers it
  ];

  const brandFuels: BrandFuelOption[] = [
    { brandId: 1, fuelTypeId: 10, code: 'G95', label: 'แก๊สโซฮอล์ 95', color: '#C44F0D' },
    { brandId: 1, fuelTypeId: 11, code: 'DIESEL', label: 'ดีเซล', color: '#0072BB' },
    { brandId: 2, fuelTypeId: 11, code: 'DIESEL', label: 'ดีเซล', color: '#62696F', marketingName: 'FuelSave Diesel' },
  ];

  function setup(): MasterDataPage {
    dataSpy = jasmine.createSpyObj<FuelDataService>('FuelDataService', ['getBrands', 'getAllBrandFuels', 'getFuelTypes']);
    dataSpy.getBrands.and.resolveTo([ptt, shell]);
    dataSpy.getAllBrandFuels.and.resolveTo(brandFuels);
    dataSpy.getFuelTypes.and.resolveTo(catalog);

    TestBed.configureTestingModule({
      declarations: [MasterDataPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [{ provide: FuelDataService, useValue: dataSpy }],
    });

    return TestBed.createComponent(MasterDataPage).componentInstance;
  }

  it('groups brand_fuel offers under each brand by brandId (client-side filter of the join)', async () => {
    const page = setup();

    await page.ngOnInit();

    expect(page.brandGroups.length).toBe(2);
    const pttGroup = page.brandGroups.find(g => g.brand.id === 1);
    const shellGroup = page.brandGroups.find(g => g.brand.id === 2);
    expect(pttGroup?.offers.length).toBe(2);
    expect(shellGroup?.offers.length).toBe(1);
    expect(shellGroup?.offers[0].marketingName).toBe('FuelSave Diesel');
  });

  it('exposes the full canonical catalog (incl. brand-less LPG) separately from the brand groups', async () => {
    const page = setup();

    await page.ngOnInit();

    expect(page.catalog.length).toBe(3);
    expect(page.catalog.some(ft => ft.code === 'LPG')).toBeTrue();
  });

  it('onLogoError() tracks the failed brand id so the template falls back to a neutral icon', () => {
    const page = setup();

    page.onLogoError(1);

    expect(page.logoErrors.has(1)).toBeTrue();
  });
});
