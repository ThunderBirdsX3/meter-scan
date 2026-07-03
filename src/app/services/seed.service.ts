import { Injectable } from '@angular/core';
import { DbService } from './db.service';
import { SEED_BRANDS, SEED_CONFIG_VERSION } from './seed-data';

const META_KEY = 'seed_config_version';

/**
 * SeedService — idempotent brand/fuel_type master-config bootstrap (FR-011).
 *
 * Guarded by a `meta.seed_config_version` row: if it already equals SEED_CONFIG_VERSION, seeding
 * is skipped entirely (FR-011 AC#2). The whole insert batch (all brands + fuel types + the meta
 * guard write) runs inside ONE explicit transaction — a mid-seed failure rolls back completely
 * (no partial/duplicate rows), so the next app launch retries cleanly from scratch (FR-011 error
 * handling). Bootstrap order enforced by app.component.ts (db.init() must resolve first).
 */
@Injectable({ providedIn: 'root' })
export class SeedService {

  constructor(private db: DbService) {}

  async seedIfNeeded(): Promise<void> {
    const seededVersion = await this.db.getMetaValue(META_KEY);
    if (seededVersion === SEED_CONFIG_VERSION) return;

    try {
      await this.db.beginSeedTransaction();
      for (const brand of SEED_BRANDS) {
        const brandId = await this.db.seedInsertBrand(brand.name, brand.logoAsset, false);
        for (const ft of brand.fuelTypes) {
          await this.db.seedInsertFuelType(brandId, ft.name, ft.grade, ft.color, false);
        }
      }
      await this.db.setMetaValue(META_KEY, SEED_CONFIG_VERSION, false);
      await this.db.commitSeedTransaction();
    } catch (err) {
      await this.db.rollbackSeedTransaction();
      throw err;
    }
  }
}
