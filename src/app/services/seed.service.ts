import { Injectable } from '@angular/core';
import { DbService } from './db.service';
import { CANONICAL_FUEL_TYPES, SEED_BRANDS, SEED_CONFIG_VERSION } from './seed-data';

const META_KEY = 'seed_config_version';

/**
 * SeedService — idempotent catalog/brand/brand_fuel master-config bootstrap (FR-011).
 *
 * Guarded by a `meta.seed_config_version` row: if it already equals SEED_CONFIG_VERSION, seeding
 * is skipped entirely (FR-011 AC#2). On a MISMATCH (including a prior seed at an older version,
 * e.g. the pre-normalization v1 per-brand rows), existing brand/fuel_type/brand_fuel rows are
 * wiped via `clearMasterDataForReseed()` before reseeding — dev reset, pre-release only (plan
 * Decision #5 / Risk R2; no diff-based partial append). The whole wipe+insert batch (catalog,
 * then brands, then brand_fuel, then the meta guard write) runs inside ONE explicit transaction —
 * a mid-seed failure rolls back completely (no partial/duplicate rows), so the next app launch
 * retries cleanly from scratch (FR-011 error handling). Bootstrap order enforced by
 * app.component.ts (db.init() must resolve first).
 */
@Injectable({ providedIn: 'root' })
export class SeedService {

  constructor(private db: DbService) {}

  async seedIfNeeded(): Promise<void> {
    const seededVersion = await this.db.getMetaValue(META_KEY);
    if (seededVersion === SEED_CONFIG_VERSION) return;

    try {
      await this.db.beginSeedTransaction();

      // Any prior seed (any version) → wipe clean before reseeding the current dataset
      // (plan Implementation Step 6 — avoids duplicate rows across a version bump).
      if (seededVersion !== null) {
        await this.db.clearMasterDataForReseed(false);
      }

      const fuelTypeIdByCode = new Map<string, number>();
      for (const ft of CANONICAL_FUEL_TYPES) {
        const id = await this.db.seedInsertFuelType(ft.code, ft.label, ft.sortOrder, false);
        fuelTypeIdByCode.set(ft.code, id);
      }

      for (const brand of SEED_BRANDS) {
        const brandId = await this.db.seedInsertBrand(brand.name, brand.logoAsset, false);
        for (const offer of brand.offers) {
          const fuelTypeId = fuelTypeIdByCode.get(offer.code);
          if (fuelTypeId == null) {
            throw new Error(`SEED: brand "${brand.name}" offers unknown fuel code "${offer.code}"`);
          }
          await this.db.seedInsertBrandFuel(brandId, fuelTypeId, offer.color, offer.marketingName, false);
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
