// Seed dataset for the canonical fuel_type catalog + brand + brand_fuel master config (FR-011).
// Source of truth: docs/vault/70-Reference/REF-Architecture.md §7 Seed Dataset.
//
// Model (schema v2 — plan 2026-07-04-1029-brand-logo-fuel-color-assets): `fuel_type` is a
// brand-agnostic CANONICAL flag catalog (11 codes below); `brand_fuel` is the per-(brand×fuel)
// join carrying the real color + optional marketing-name override. Every color below is REAL —
// sourced verbatim from fuel-brand-assets/fuel-colors-by-brand.md (plan "Seed map" section);
// no guessed values, no PLACEHOLDER_FUEL_COLOR remains.
//
// Logo asset path: 'assets/brand-logos/<slug>.ico' — NO 'src/' prefix (Angular serves
// '/assets/...' at runtime; the old 'src/' prefix always 404'd — plan Doc Gap "Logo path bug").

export interface SeedFuelType {
  code: string;
  label: string;
  sortOrder: number;
}

// 11-code canonical catalog (plan Decisions #2, Seed map preamble).
export const CANONICAL_FUEL_TYPES: SeedFuelType[] = [
  { code: 'G91', label: 'แก๊สโซฮอล์ 91', sortOrder: 10 },
  { code: 'G95', label: 'แก๊สโซฮอล์ 95', sortOrder: 20 },
  { code: 'G95+', label: 'แก๊สโซฮอล์ 95 พรีเมียม', sortOrder: 30 },
  { code: 'E20', label: 'แก๊สโซฮอล์ E20', sortOrder: 40 },
  { code: 'E85', label: 'แก๊สโซฮอล์ E85', sortOrder: 50 },
  { code: 'B95', label: 'เบนซิน 95', sortOrder: 60 },
  { code: 'DIESEL', label: 'ดีเซล', sortOrder: 70 },
  { code: 'DIESEL+', label: 'ดีเซลพรีเมียม', sortOrder: 80 },
  { code: 'B20', label: 'ดีเซล B20', sortOrder: 90 },
  { code: 'NGV', label: 'NGV', sortOrder: 100 },
  { code: 'LPG', label: 'LPG', sortOrder: 110 }, // catalog-only — no brand offers it in this seed (Seed map note)
];

export interface SeedBrandFuelOffer {
  code: string;           // resolves to a CANONICAL_FUEL_TYPES[].code at seed time
  color: string;          // hex, real (fuel-colors-by-brand.md) — no guessing (plan Risk R4)
  marketingName?: string; // optional per-brand display override
}

export interface SeedBrand {
  name: string;
  logoAsset: string;
  offers: SeedBrandFuelOffer[];
}

// 8 brands only (plan Decisions #3) — Esso/Mobil + Sinopec + "อื่นๆ (Other)" dropped.
export const SEED_BRANDS: SeedBrand[] = [
  {
    name: 'PTT',
    logoAsset: 'assets/brand-logos/ptt.ico',
    offers: [
      { code: 'G95', color: '#C44F0D' },
      { code: 'G91', color: '#00853F' },
      { code: 'E20', color: '#98C93C' },
      { code: 'E85', color: '#A83292' },
      { code: 'G95+', color: '#FA6B14' },
      { code: 'B95', color: '#FFC10E' },
      { code: 'DIESEL', color: '#0072BB' },
      { code: 'DIESEL+', color: '#012872' },
      { code: 'NGV', color: '#00C0F2' },
    ],
  },
  {
    name: 'Bangchak',
    logoAsset: 'assets/brand-logos/bangchak.ico',
    offers: [
      { code: 'G95', color: '#0075B8', marketingName: 'ไฮเอโว 95S' },
      { code: 'G91', color: '#009C8F', marketingName: 'ไฮเอโว 91S' },
      { code: 'E20', color: '#F2572B' },
      { code: 'E85', color: '#CB2028' },
      { code: 'G95+', color: '#AA872C', marketingName: 'Hi Premium 97' },
      { code: 'DIESEL', color: '#2B296A', marketingName: 'ไฮดีเซล' },
      { code: 'DIESEL+', color: '#603D97', marketingName: 'ไฮพรีเมียมดีเซล' },
    ],
  },
  {
    name: 'Shell',
    logoAsset: 'assets/brand-logos/shell.ico',
    offers: [
      { code: 'G95', color: '#EC6C2C', marketingName: 'FuelSave 95' },
      { code: 'G91', color: '#A6C846', marketingName: 'FuelSave 91' },
      { code: 'E20', color: '#00AFB2' },
      { code: 'G95+', color: '#EC6C2C', marketingName: 'V-Power 95' },
      { code: 'DIESEL', color: '#62696F', marketingName: 'FuelSave Diesel' },
      { code: 'DIESEL+', color: '#A7A8AC', marketingName: 'V-Power Diesel' },
    ],
  },
  {
    name: 'Caltex',
    logoAsset: 'assets/brand-logos/caltex.ico',
    offers: [
      { code: 'G95', color: '#F26F21' },
      { code: 'G91', color: '#00A74F' },
      { code: 'E20', color: '#98C93C' },
      { code: 'B95', color: '#FFC10E' },
      { code: 'DIESEL', color: '#0072BB' },
      { code: 'DIESEL+', color: '#012872' },
    ],
  },
  {
    name: 'PT (พีที)',
    logoAsset: 'assets/brand-logos/pt.ico',
    offers: [
      { code: 'G95', color: '#EC6C2C' },
      { code: 'G91', color: '#A6C846' },
      { code: 'E20', color: '#00AFB2' },
      { code: 'B95', color: '#FECD22' },
      { code: 'DIESEL', color: '#62696F' },
      { code: 'DIESEL+', color: '#0CAA4D' },
    ],
  },
  {
    name: 'IRPC',
    logoAsset: 'assets/brand-logos/irpc.ico',
    offers: [
      { code: 'G95', color: '#B2061C' },
      { code: 'G91', color: '#FF710A' },
      { code: 'DIESEL', color: '#0B4F90' },
    ],
  },
  {
    name: 'Susco',
    logoAsset: 'assets/brand-logos/susco.ico',
    offers: [
      { code: 'G95', color: '#B2061C' },
      { code: 'G91', color: '#FF710A' },
      { code: 'E20', color: '#1F6600' },
      { code: 'B95', color: '#08B0EF' },
      { code: 'DIESEL', color: '#0B4F90' },
      { code: 'B20', color: '#00376B' },
    ],
  },
  {
    name: 'PURE',
    logoAsset: 'assets/brand-logos/pure.ico',
    offers: [
      { code: 'G95', color: '#B2061C' },
      { code: 'G91', color: '#FF710A' },
      { code: 'E20', color: '#1F6600' },
      { code: 'DIESEL', color: '#0B4F90' },
      { code: 'B20', color: '#00376B' },
    ],
  },
];

// Bump this on any SEED_BRANDS/CANONICAL_FUEL_TYPES content change. SeedService wipes
// brand/fuel_type/brand_fuel and reseeds the full set on a version mismatch (dev reset,
// pre-release only — plan Decision #5 / Risk R2). '2' = the normalized catalog+join model.
export const SEED_CONFIG_VERSION = '2';
