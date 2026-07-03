// Seed dataset for brand + fuel_type master config (FR-011).
// Source of truth: docs/vault/70-Reference/REF-Architecture.md §7 Seed Dataset.
//
// Color: NO verified real per-brand fuel color reference is available (REF-Architecture §7 TODO;
// plan 2026-07-02-2140-sqlite-persistence-seed Risks §"fuel color reference ไม่มีจริงในมือ" —
// "อย่าเดาสีมั่ว"). Using a single flat neutral placeholder for ALL entries so it is obviously NOT
// a real brand color and cannot be mistaken for verified data. Replace with real hex values once a
// reference is collected — see REF-Architecture §7 TODO.
// TODO: verify real brand color — placeholder only, do not treat as design-accurate.
const PLACEHOLDER_FUEL_COLOR = '#9CA3AF';

export interface SeedFuelType {
  name: string;
  grade?: string;
  color: string;
}

export interface SeedBrand {
  name: string;
  logoAsset: string;
  fuelTypes: SeedFuelType[];
}

export const SEED_BRANDS: SeedBrand[] = [
  {
    name: 'PTT Station',
    logoAsset: 'src/assets/brand-logos/ptt.png',
    fuelTypes: [
      { name: 'แก๊สโซฮอล์ 95', grade: '95', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'แก๊สโซฮอล์ 91', grade: '91', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'แก๊สโซฮอล์ E20', grade: 'E20', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'แก๊สโซฮอล์ E85', grade: 'E85', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'Super Power Gasohol 95', grade: '95', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'ดีเซล B7', grade: 'B7', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'Hi Diesel S B20', grade: 'B20', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'Hi Diesel S พรีเมียม', grade: 'B7', color: PLACEHOLDER_FUEL_COLOR },
    ],
  },
  {
    name: 'Bangchak',
    logoAsset: 'src/assets/brand-logos/bangchak.png',
    fuelTypes: [
      { name: 'แก๊สโซฮอล์ 95', grade: '95', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'แก๊สโซฮอล์ 91', grade: '91', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'แก๊สโซฮอล์ E20', grade: 'E20', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'แก๊สโซฮอล์ E85', grade: 'E85', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'Hi Premium 97', grade: '97', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'ดีเซล B7', grade: 'B7', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'Hi Premium Diesel S', grade: 'B7', color: PLACEHOLDER_FUEL_COLOR },
    ],
  },
  {
    name: 'Shell',
    logoAsset: 'src/assets/brand-logos/shell.png',
    fuelTypes: [
      { name: 'FuelSave แก๊สโซฮอล์ 95', grade: '95', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'FuelSave แก๊สโซฮอล์ 91', grade: '91', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'แก๊สโซฮอล์ E20', grade: 'E20', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'V-Power Gasohol 95', grade: '95', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'FuelSave Diesel B7', grade: 'B7', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'V-Power Diesel', grade: 'B7', color: PLACEHOLDER_FUEL_COLOR },
    ],
  },
  {
    name: 'Esso / Mobil',
    logoAsset: 'src/assets/brand-logos/esso-mobil.png',
    fuelTypes: [
      { name: 'Supreme แก๊สโซฮอล์ 95', grade: '95', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'Supreme แก๊สโซฮอล์ 91', grade: '91', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'แก๊สโซฮอล์ E20', grade: 'E20', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'Supreme+ Gasohol 95', grade: '95', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'Supreme Diesel B7', grade: 'B7', color: PLACEHOLDER_FUEL_COLOR },
    ],
  },
  {
    name: 'Caltex',
    logoAsset: 'src/assets/brand-logos/caltex.png',
    fuelTypes: [
      { name: 'Techron แก๊สโซฮอล์ 95', grade: '95', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'Techron แก๊สโซฮอล์ 91', grade: '91', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'แก๊สโซฮอล์ E20', grade: 'E20', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'แก๊สโซฮอล์ E85', grade: 'E85', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'Diesel B7', grade: 'B7', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'Power Diesel', grade: 'B7', color: PLACEHOLDER_FUEL_COLOR },
    ],
  },
  {
    name: 'PT (พีที)',
    logoAsset: 'src/assets/brand-logos/pt.png',
    fuelTypes: [
      { name: 'แก๊สโซฮอล์ 95', grade: '95', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'แก๊สโซฮอล์ 91', grade: '91', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'แก๊สโซฮอล์ E20', grade: 'E20', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'แก๊สโซฮอล์ E85', grade: 'E85', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'ดีเซล B7', grade: 'B7', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'ดีเซล B20', grade: 'B20', color: PLACEHOLDER_FUEL_COLOR },
    ],
  },
  {
    name: 'Susco',
    logoAsset: 'src/assets/brand-logos/susco.png',
    fuelTypes: [
      { name: 'แก๊สโซฮอล์ 95', grade: '95', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'แก๊สโซฮอล์ 91', grade: '91', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'แก๊สโซฮอล์ E20', grade: 'E20', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'ดีเซล B7', grade: 'B7', color: PLACEHOLDER_FUEL_COLOR },
    ],
  },
  {
    name: 'อื่นๆ (Other)',
    logoAsset: 'src/assets/brand-logos/other.png',
    fuelTypes: [
      { name: 'เบนซิน 95', grade: '95', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'แก๊สโซฮอล์ 95', grade: '95', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'แก๊สโซฮอล์ 91', grade: '91', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'E20', grade: 'E20', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'E85', grade: 'E85', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'ดีเซล B7', grade: 'B7', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'ดีเซล B20', grade: 'B20', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'NGV', grade: 'NGV', color: PLACEHOLDER_FUEL_COLOR },
      { name: 'LPG', grade: 'LPG', color: PLACEHOLDER_FUEL_COLOR },
    ],
  },
];

// Bump this when SEED_BRANDS content changes and new rows must be appended on next app open
// (FR-011: "config ใหม่ใน app version ถัดไป = append rows ใหม่ (ไม่ลบของเดิม กัน dangling FK)").
// NOTE: the current SeedService guard is a simple all-or-nothing version check (see seed.service.ts) —
// bumping this re-runs the full seed list; it does NOT yet do a diff-based partial append. Sufficient
// for FR-011 AC#1/#2 (fresh install seeds once; idempotent on same version). Partial-append across
// versions is a known limitation — flag if/when a v2 dataset needs it.
export const SEED_CONFIG_VERSION = '1';
