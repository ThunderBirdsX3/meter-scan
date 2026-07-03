import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Brand, FuelEntry, FuelType, Trip, Vehicle } from '../models/fuel-entry.model';

const DB_NAME = 'fuel_log';
const DB_VERSION = 1;

// DDL v1 — mirrors docs/vault/70-Reference/REF-Architecture.md §3 verbatim, plus the `meta`
// config-version guard table used by SeedService (plan Implementation Step 6).
const DDL_V1 = `
CREATE TABLE IF NOT EXISTS brand (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  logo_asset TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fuel_type (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id INTEGER NOT NULL REFERENCES brand(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade TEXT,
  color TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicle (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  plate TEXT,
  default_fuel_type_id INTEGER REFERENCES fuel_type(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trip (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  vehicle_id INTEGER REFERENCES vehicle(id) ON DELETE SET NULL,
  start_date TEXT,
  note TEXT,
  is_active INTEGER NOT NULL DEFAULT 0,
  ended_at TEXT,
  start_odometer REAL,
  end_odometer REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fuel_entry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  datetime TEXT NOT NULL,
  vehicle_id INTEGER REFERENCES vehicle(id) ON DELETE SET NULL,
  trip_id INTEGER REFERENCES trip(id) ON DELETE SET NULL,
  brand_id INTEGER REFERENCES brand(id) ON DELETE SET NULL,
  fuel_type_id INTEGER REFERENCES fuel_type(id) ON DELETE SET NULL,
  liters REAL NOT NULL,
  price_per_liter REAL NOT NULL,
  amount REAL NOT NULL,
  odometer_km REAL,
  station TEXT,
  note TEXT,
  image_uri TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_entry_vehicle_dt ON fuel_entry(vehicle_id, datetime);
CREATE INDEX IF NOT EXISTS idx_entry_trip ON fuel_entry(trip_id);
CREATE INDEX IF NOT EXISTS idx_entry_dt ON fuel_entry(datetime);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

// ── Row shapes (snake_case, as returned by SQLite) ──────────────────────────
interface VehicleRow { id: number; name: string; plate: string | null; default_fuel_type_id: number | null; created_at: string; }
interface TripRow { id: number; name: string; vehicle_id: number | null; start_date: string | null; note: string | null; is_active: number; ended_at: string | null; start_odometer: number | null; end_odometer: number | null; created_at: string; }
interface BrandRow { id: number; name: string; logo_asset: string | null; deleted_at: string | null; created_at: string; }
interface FuelTypeRow { id: number; brand_id: number; name: string; grade: string | null; color: string | null; deleted_at: string | null; created_at: string; }
interface FuelEntryRow {
  id: number; datetime: string; vehicle_id: number | null; trip_id: number | null; brand_id: number | null; fuel_type_id: number | null;
  liters: number; price_per_liter: number; amount: number; odometer_km: number | null; station: string | null; note: string | null;
  image_uri: string | null; created_at: string;
}

function rowToVehicle(r: VehicleRow): Vehicle {
  return {
    id: r.id,
    name: r.name,
    licensePlate: r.plate ?? undefined,
    fuelTypeId: r.default_fuel_type_id ?? undefined,
    createdAt: new Date(r.created_at),
  };
}

function rowToTrip(r: TripRow): Trip {
  return {
    id: r.id,
    name: r.name,
    vehicleId: r.vehicle_id ?? undefined,
    startOdometer: r.start_odometer ?? undefined,
    createdAt: new Date(r.created_at),
    isActive: !!r.is_active,
    endedAt: r.ended_at ? new Date(r.ended_at) : undefined,
    endOdometer: r.end_odometer ?? undefined,
  };
}

function rowToBrand(r: BrandRow): Brand {
  return {
    id: r.id,
    name: r.name,
    logoAsset: r.logo_asset ?? undefined,
    deletedAt: r.deleted_at ? new Date(r.deleted_at) : undefined,
  };
}

function rowToFuelType(r: FuelTypeRow): FuelType {
  return {
    id: r.id,
    name: r.name,
    brandId: r.brand_id ?? undefined,
    grade: r.grade ?? undefined,
    color: r.color ?? undefined,
    deletedAt: r.deleted_at ? new Date(r.deleted_at) : undefined,
  };
}

function rowToFuelEntry(r: FuelEntryRow): FuelEntry {
  return {
    id: r.id,
    vehicleId: r.vehicle_id ?? undefined,
    tripId: r.trip_id ?? undefined,
    brandId: r.brand_id ?? undefined,
    fuelTypeId: r.fuel_type_id ?? undefined,
    liters: r.liters,
    pricePerLiter: r.price_per_liter,
    totalAmount: r.amount,
    odometer: r.odometer_km ?? undefined,
    station: r.station ?? undefined,
    note: r.note ?? undefined,
    datetime: new Date(r.datetime),
    imageUri: r.image_uri ?? undefined,
    createdAt: new Date(r.created_at),
  };
}

/**
 * DbService — SQLite persistence layer (FR-010) via @capacitor-community/sqlite.
 *
 * Native only (Capacitor.isNativePlatform()) — web/PWA is out of scope (plan Non-goals; no
 * jeep-sqlite/wasm store wired). All writes are parametrized + transactional (`run`/`execute`
 * with `transaction=true`) per NFR-003. snake_case (DB) <-> camelCase (TS model) mapping happens
 * ONLY in this file (Doc Gap #3 — model field names are never renamed to match DDL columns).
 */
@Injectable({ providedIn: 'root' })
export class DbService {
  private sqlite = new SQLiteConnection(CapacitorSQLite);
  private db: SQLiteDBConnection | null = null;
  private initPromise: Promise<void> | null = null;

  /** Open/create DB + run migration. Idempotent — safe to call multiple times (returns same promise while pending). */
  init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.doInit().catch((err) => {
        // Allow a retry (DB_INIT UX — SRS §7) by clearing the cached failed promise.
        this.initPromise = null;
        this.db = null;
        throw err;
      });
    }
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      // Web/PWA SQLite (jeep-sqlite/wasm) intentionally out of scope — plan Non-goals.
      throw new Error('DB_INIT: SQLite รองรับเฉพาะแอปมือถือ (native) — ไม่รองรับ web/PWA ในเวอร์ชันนี้');
    }
    this.db = await this.sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false);
    await this.db.open();
    await this.db.execute('PRAGMA foreign_keys = ON;', false);
    await this.migrate();
  }

  private async migrate(): Promise<void> {
    const db = this.conn();
    const versionRes = await db.query('PRAGMA user_version;');
    const currentVersion = Number(versionRes.values?.[0]?.user_version ?? 0);
    if (currentVersion < 1) {
      await db.execute(DDL_V1, true);
      await db.execute('PRAGMA user_version = 1;', false);
    }
  }

  private conn(): SQLiteDBConnection {
    if (!this.db) throw new Error('DB_WRITE: database not initialized — call init() first');
    return this.db;
  }

  // ── Vehicles (FR-003) ────────────────────────────────────────────────────

  async getVehicles(): Promise<Vehicle[]> {
    const res = await this.conn().query('SELECT * FROM vehicle ORDER BY id DESC;');
    return (res.values as VehicleRow[] ?? []).map(rowToVehicle);
  }

  async addVehicle(v: Omit<Vehicle, 'id' | 'createdAt'>): Promise<Vehicle> {
    const res = await this.conn().run(
      'INSERT INTO vehicle (name, plate, default_fuel_type_id) VALUES (?, ?, ?);',
      [v.name, v.licensePlate ?? null, v.fuelTypeId ?? null],
    );
    const id = res.changes?.lastId;
    if (id == null) throw new Error('DB_WRITE: insert vehicle failed');
    const created = await this.getVehicleById(id);
    if (!created) throw new Error('DB_WRITE: vehicle not found after insert');
    return created;
  }

  async updateVehicle(id: number, patch: Partial<Omit<Vehicle, 'id' | 'createdAt'>>): Promise<Vehicle> {
    const sets: string[] = [];
    const values: unknown[] = [];
    if ('name' in patch) { sets.push('name = ?'); values.push(patch.name); }
    if ('licensePlate' in patch) { sets.push('plate = ?'); values.push(patch.licensePlate ?? null); }
    if ('fuelTypeId' in patch) { sets.push('default_fuel_type_id = ?'); values.push(patch.fuelTypeId ?? null); }
    if (sets.length > 0) {
      values.push(id);
      await this.conn().run(`UPDATE vehicle SET ${sets.join(', ')} WHERE id = ?;`, values);
    }
    const updated = await this.getVehicleById(id);
    if (!updated) throw new Error('Vehicle not found');
    return updated;
  }

  async deleteVehicle(id: number): Promise<void> {
    await this.conn().run('DELETE FROM vehicle WHERE id = ?;', [id]);
  }

  private async getVehicleById(id: number): Promise<Vehicle | null> {
    const res = await this.conn().query('SELECT * FROM vehicle WHERE id = ?;', [id]);
    const row = (res.values as VehicleRow[] ?? [])[0];
    return row ? rowToVehicle(row) : null;
  }

  // ── Trips (FR-004) ───────────────────────────────────────────────────────

  async getTrips(): Promise<Trip[]> {
    const res = await this.conn().query('SELECT * FROM trip ORDER BY id DESC;');
    return (res.values as TripRow[] ?? []).map(rowToTrip);
  }

  async addTrip(t: Omit<Trip, 'id' | 'createdAt'>): Promise<Trip> {
    const res = await this.conn().run(
      'INSERT INTO trip (name, vehicle_id, start_odometer, is_active, ended_at, end_odometer) VALUES (?, ?, ?, ?, ?, ?);',
      [
        t.name,
        t.vehicleId ?? null,
        t.startOdometer ?? null,
        t.isActive ? 1 : 0,
        t.endedAt ? t.endedAt.toISOString() : null,
        t.endOdometer ?? null,
      ],
    );
    const id = res.changes?.lastId;
    if (id == null) throw new Error('DB_WRITE: insert trip failed');
    const created = await this.getTripById(id);
    if (!created) throw new Error('DB_WRITE: trip not found after insert');
    return created;
  }

  async updateTrip(id: number, patch: Partial<Omit<Trip, 'id' | 'createdAt'>>): Promise<Trip> {
    const sets: string[] = [];
    const values: unknown[] = [];
    if ('name' in patch) { sets.push('name = ?'); values.push(patch.name); }
    if ('vehicleId' in patch) { sets.push('vehicle_id = ?'); values.push(patch.vehicleId ?? null); }
    if ('startOdometer' in patch) { sets.push('start_odometer = ?'); values.push(patch.startOdometer ?? null); }
    if ('isActive' in patch) { sets.push('is_active = ?'); values.push(patch.isActive ? 1 : 0); }
    if ('endedAt' in patch) { sets.push('ended_at = ?'); values.push(patch.endedAt ? patch.endedAt.toISOString() : null); }
    if ('endOdometer' in patch) { sets.push('end_odometer = ?'); values.push(patch.endOdometer ?? null); }
    if (sets.length > 0) {
      values.push(id);
      await this.conn().run(`UPDATE trip SET ${sets.join(', ')} WHERE id = ?;`, values);
    }
    const updated = await this.getTripById(id);
    if (!updated) throw new Error('Trip not found');
    return updated;
  }

  async deleteTrip(id: number): Promise<void> {
    await this.conn().run('DELETE FROM trip WHERE id = ?;', [id]);
  }

  private async getTripById(id: number): Promise<Trip | null> {
    const res = await this.conn().query('SELECT * FROM trip WHERE id = ?;', [id]);
    const row = (res.values as TripRow[] ?? [])[0];
    return row ? rowToTrip(row) : null;
  }

  // ── Brands + FuelTypes — master config, read-only for app UI (FR-005) ────

  /** Picker source — soft-hidden rows excluded. */
  async getBrands(): Promise<Brand[]> {
    const res = await this.conn().query('SELECT * FROM brand WHERE deleted_at IS NULL ORDER BY id;');
    return (res.values as BrandRow[] ?? []).map(rowToBrand);
  }

  /** Picker source — soft-hidden rows excluded. */
  async getFuelTypes(): Promise<FuelType[]> {
    const res = await this.conn().query('SELECT * FROM fuel_type WHERE deleted_at IS NULL ORDER BY id;');
    return (res.values as FuelTypeRow[] ?? []).map(rowToFuelType);
  }

  /** Unfiltered lookup so history/entry-detail can still resolve a soft-hidden brand's name/logo (SRS FR-005 AC#4). */
  async getBrandById(id: number): Promise<Brand | null> {
    const res = await this.conn().query('SELECT * FROM brand WHERE id = ?;', [id]);
    const row = (res.values as BrandRow[] ?? [])[0];
    return row ? rowToBrand(row) : null;
  }

  /** Unfiltered lookup so history/entry-detail can still resolve a soft-hidden fuel type's name/color (SRS FR-005 AC#4). */
  async getFuelTypeById(id: number): Promise<FuelType | null> {
    const res = await this.conn().query('SELECT * FROM fuel_type WHERE id = ?;', [id]);
    const row = (res.values as FuelTypeRow[] ?? [])[0];
    return row ? rowToFuelType(row) : null;
  }

  /** Config-lifecycle capability only — no user-facing UI trigger exists yet (SRS FR-005 §Config lifecycle). */
  async softDeleteBrand(id: number): Promise<void> {
    await this.conn().run('UPDATE brand SET deleted_at = ? WHERE id = ?;', [new Date().toISOString(), id]);
  }

  /** Config-lifecycle capability only — no user-facing UI trigger exists yet (SRS FR-005 §Config lifecycle). */
  async softDeleteFuelType(id: number): Promise<void> {
    await this.conn().run('UPDATE fuel_type SET deleted_at = ? WHERE id = ?;', [new Date().toISOString(), id]);
  }

  // ── Fuel Entries (FR-001/002) ─────────────────────────────────────────────

  async getEntries(filter?: { vehicleId?: number; tripId?: number }): Promise<FuelEntry[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (filter?.vehicleId != null) { clauses.push('vehicle_id = ?'); values.push(filter.vehicleId); }
    if (filter?.tripId != null) { clauses.push('trip_id = ?'); values.push(filter.tripId); }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')} ` : '';
    const res = await this.conn().query(`SELECT * FROM fuel_entry ${where}ORDER BY datetime DESC;`, values);
    return (res.values as FuelEntryRow[] ?? []).map(rowToFuelEntry);
  }

  async getEntry(id: number): Promise<FuelEntry | null> {
    const res = await this.conn().query('SELECT * FROM fuel_entry WHERE id = ?;', [id]);
    const row = (res.values as FuelEntryRow[] ?? [])[0];
    return row ? rowToFuelEntry(row) : null;
  }

  async addEntry(e: Omit<FuelEntry, 'id' | 'createdAt'>): Promise<FuelEntry> {
    // liters/price_per_liter/amount are DDL NOT NULL (§3) while the model keeps them independent
    // + optional (FR-001/FR-020 — user fills whichever they know). Default missing numeric fields
    // to 0 at the persistence boundary only; UI-level "at least one of the three" validation is
    // enforced in add.page.ts before calling this.
    const res = await this.conn().run(
      `INSERT INTO fuel_entry
        (datetime, vehicle_id, trip_id, brand_id, fuel_type_id, liters, price_per_liter, amount, odometer_km, station, note, image_uri)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        e.datetime.toISOString(),
        e.vehicleId ?? null,
        e.tripId ?? null,
        e.brandId ?? null,
        e.fuelTypeId ?? null,
        e.liters ?? 0,
        e.pricePerLiter ?? 0,
        e.totalAmount ?? 0,
        e.odometer ?? null,
        e.station ?? null,
        e.note ?? null,
        e.imageUri ?? null,
      ],
    );
    const id = res.changes?.lastId;
    if (id == null) throw new Error('DB_WRITE: insert fuel_entry failed');
    const created = await this.getEntry(id);
    if (!created) throw new Error('DB_WRITE: fuel_entry not found after insert');
    return created;
  }

  async updateEntry(id: number, patch: Partial<Omit<FuelEntry, 'id' | 'createdAt'>>): Promise<FuelEntry> {
    const sets: string[] = [];
    const values: unknown[] = [];
    const col: Record<string, string> = {
      vehicleId: 'vehicle_id', tripId: 'trip_id', brandId: 'brand_id', fuelTypeId: 'fuel_type_id',
      liters: 'liters', pricePerLiter: 'price_per_liter', totalAmount: 'amount', odometer: 'odometer_km',
      station: 'station', note: 'note', imageUri: 'image_uri',
    };
    for (const key of Object.keys(col)) {
      if (key in patch) {
        sets.push(`${col[key]} = ?`);
        values.push((patch as Record<string, unknown>)[key] ?? null);
      }
    }
    if ('datetime' in patch && patch.datetime) {
      sets.push('datetime = ?');
      values.push(patch.datetime.toISOString());
    }
    if (sets.length > 0) {
      values.push(id);
      await this.conn().run(`UPDATE fuel_entry SET ${sets.join(', ')} WHERE id = ?;`, values);
    }
    const updated = await this.getEntry(id);
    if (!updated) throw new Error('Entry not found');
    return updated;
  }

  async deleteEntry(id: number): Promise<void> {
    // Delete DB row only — gallery photo (image_uri) is intentionally left untouched
    // (SRS Clarify 2026-07-02(b) Q2 — "คงรูปไว้ในแกลเลอรี").
    await this.conn().run('DELETE FROM fuel_entry WHERE id = ?;', [id]);
  }

  // ── Seed support (used by SeedService only — brand/fuel_type stay read-only for the rest of the app) ──

  async getMetaValue(key: string): Promise<string | null> {
    const res = await this.conn().query('SELECT value FROM meta WHERE key = ?;', [key]);
    const row = (res.values as { value: string }[] ?? [])[0];
    return row ? row.value : null;
  }

  /** @param transaction pass `false` when called inside an outer explicit begin/commitSeedTransaction block. */
  async setMetaValue(key: string, value: string, transaction = true): Promise<void> {
    await this.conn().run(
      'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;',
      [key, value],
      transaction,
    );
  }

  /** @param transaction pass `false` when called inside an outer explicit begin/commitSeedTransaction block. */
  async seedInsertBrand(name: string, logoAsset: string, transaction = true): Promise<number> {
    const res = await this.conn().run('INSERT INTO brand (name, logo_asset) VALUES (?, ?);', [name, logoAsset], transaction);
    const id = res.changes?.lastId;
    if (id == null) throw new Error('DB_WRITE: insert brand (seed) failed');
    return id;
  }

  /** @param transaction pass `false` when called inside an outer explicit begin/commitSeedTransaction block. */
  async seedInsertFuelType(brandId: number, name: string, grade: string | undefined, color: string, transaction = true): Promise<number> {
    const res = await this.conn().run(
      'INSERT INTO fuel_type (brand_id, name, grade, color) VALUES (?, ?, ?, ?);',
      [brandId, name, grade ?? null, color],
      transaction,
    );
    const id = res.changes?.lastId;
    if (id == null) throw new Error('DB_WRITE: insert fuel_type (seed) failed');
    return id;
  }

  /**
   * Explicit transaction control — used by SeedService to wrap the whole brand/fuel_type bulk
   * insert in ONE atomic transaction (FR-011 error handling: "seed fail กลางคัน → rollback
   * transaction, retry ครั้งหน้า"). All statements run inside must pass `transaction=false` to
   * their own `run()`/`execute()` calls (SQLite does not support nested BEGIN).
   */
  async beginSeedTransaction(): Promise<void> {
    await this.conn().execute('BEGIN TRANSACTION;', false);
  }

  async commitSeedTransaction(): Promise<void> {
    await this.conn().execute('COMMIT;', false);
  }

  async rollbackSeedTransaction(): Promise<void> {
    await this.conn().execute('ROLLBACK;', false);
  }
}
