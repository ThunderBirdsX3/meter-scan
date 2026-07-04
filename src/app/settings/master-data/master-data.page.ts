import { Component, OnInit } from '@angular/core';
import { FuelDataService } from '../../services/fuel-data.service';
import { Brand, BrandFuelOption, FuelType } from '../../models/fuel-entry.model';

interface BrandGroup {
  brand: Brand;
  offers: BrandFuelOption[];
}

@Component({
  selector: 'app-master-data',
  templateUrl: 'master-data.page.html',
  styleUrls: ['master-data.page.scss'],
  standalone: false,
})
export class MasterDataPage implements OnInit {

  brandGroups: BrandGroup[] = [];
  // Full canonical catalog (brand-agnostic, schema v2) — shown separately from per-brand
  // offerings so brand-less entries (e.g. LPG, which no seeded brand currently sells) are
  // still visible (plan Implementation Step 9).
  catalog: FuelType[] = [];

  // Brand logo asset load failures (Design Addition — falls back to a neutral icon per brand id)
  logoErrors = new Set<number>();

  constructor(private data: FuelDataService) {}

  async ngOnInit() {
    // getBrands()/getFuelTypes()/getAllBrandFuels() already filter soft-hidden rows server-side
    // (WHERE deleted_at IS NULL) — no extra client-side filtering needed here.
    const [brands, allBrandFuels, catalog] = await Promise.all([
      this.data.getBrands(),
      this.data.getAllBrandFuels(),
      this.data.getFuelTypes(),
    ]);

    this.brandGroups = brands.map(brand => ({
      brand,
      offers: allBrandFuels.filter(o => o.brandId === brand.id),
    }));
    this.catalog = catalog;
  }

  onLogoError(brandId: number): void {
    this.logoErrors.add(brandId);
  }
}
