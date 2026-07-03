import { Component, OnInit } from '@angular/core';
import { FuelDataService } from '../../services/fuel-data.service';
import { Brand, FuelType } from '../../models/fuel-entry.model';

interface BrandGroup {
  brand: Brand;
  fuelTypes: FuelType[];
}

@Component({
  selector: 'app-master-data',
  templateUrl: 'master-data.page.html',
  styleUrls: ['master-data.page.scss'],
  standalone: false,
})
export class MasterDataPage implements OnInit {

  brandGroups: BrandGroup[] = [];
  ungroupedFuelTypes: FuelType[] = [];

  // Brand logo asset load failures (Design Addition — falls back to a neutral icon per brand id)
  logoErrors = new Set<number>();

  constructor(private data: FuelDataService) {}

  async ngOnInit() {
    // getBrands()/getFuelTypes() already filter soft-hidden rows server-side
    // (WHERE deleted_at IS NULL) — no extra client-side filtering needed here.
    const [brands, fuelTypes] = await Promise.all([
      this.data.getBrands(),
      this.data.getFuelTypes(),
    ]);

    this.brandGroups = brands.map(brand => ({
      brand,
      fuelTypes: fuelTypes.filter(ft => ft.brandId === brand.id),
    }));
    this.ungroupedFuelTypes = fuelTypes.filter(ft => !ft.brandId);
  }

  onLogoError(brandId: number): void {
    this.logoErrors.add(brandId);
  }
}
