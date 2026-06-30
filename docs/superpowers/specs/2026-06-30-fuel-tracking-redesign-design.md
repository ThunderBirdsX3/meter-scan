# Meter Scan v2 — Fuel Tracking Redesign

**Date:** 2026-06-30
**Status:** Approved (design)

## Purpose

Redesign Meter Scan from a single-screen OCR demo into a real-world personal
fuel-tracking app. A single user photographs a fuel dispenser meter, the
on-device CRNN reads baht / liters / price-per-liter, the user confirms or
edits, and the record is persisted. The user can review history, see spending
and efficiency analytics, manage vehicles, and group fill-ups into named trips.

Single user. No accounts, no sync, no backend — fully offline, on-device.

## Goals

- Persist fill-up records on device (current app loses history on close).
- Confirm/edit OCR output before saving (correct misreads).
- Track spending and fuel efficiency (km/L) over time.
- Optionally associate records with a vehicle and a named trip.
- Use Ionic components throughout; keep the existing module-based
  (`standalone: false`) NgModule architecture.

## Non-Goals (YAGNI)

- Multi-user / login / cloud sync.
- Multiple simultaneously-active trips (one active trip globally).
- A separate `trip` distance meter field (distance derived from odometer).
- Heavy charting libraries (start with simple bars/lists).
- Capturing/labeling data for model retraining (separate workflow, out of scope).

## Navigation

`ion-tabs` with 4 tabs, left→right:

1. **Stats**
2. **Scan** — center, default landing tab (primary action, thumb-reachable)
3. **History**
4. **Settings** (Vehicles, Trips, Export, data management)

Routing restructure:

- `app-routing.module.ts` → loads `TabsPageModule` at `''`.
- `tabs-routing.module.ts` → children: `stats`, `scan`, `history`, `settings`,
  with `settings/trips` and `settings/trips/:id` as nested routes (or modals).
- Default redirect → `tabs/scan`.
- Remove the old standalone `home` route; the existing `home.page` scan/canvas
  logic is moved into `ScanPage`.

Each page keeps the project convention: `.page.ts` + `.module.ts` +
`-routing.module.ts`, `standalone: false`.

## Data Model

Persisted via `@capacitor/preferences` as JSON blobs (key-value). Sufficient for
personal scale (hundreds of records); avoids a native SQLite plugin. Keys:
`records`, `vehicles`, `trips`.

```ts
interface FuelRecord {
  id: string;            // uuid
  timestamp: number;     // epoch ms
  baht: number;          // scanned
  liters: number;        // scanned
  pricePerLiter: number; // scanned (cross-check against baht/liters)
  odometer?: number;     // manual, optional — cumulative dashboard reading
  vehicleId?: string;    // optional
  tripId?: string;       // optional — auto-set to active trip at save time
  photoUri?: string;     // reference to photo saved in device gallery
  source: 'auto' | 'manual' | 'edited';
}

interface Vehicle {
  id: string;
  name: string;          // "Civic", "มอไซค์"
  plate?: string;
  fuelType?: string;     // เบนซิน / ดีเซล / ...
}

interface Trip {
  id: string;
  name: string;          // "เชียงใหม่-ขอนแก่น"
  vehicleId?: string;
  startTime: number;
  endTime?: number;      // undefined = active
  startOdometer?: number;
  endOdometer?: number;
}
```

### Derived values (not stored)

- **trip distance per fill-up** = `odometer(this) − odometer(previous)` for the
  same vehicle, ordered by timestamp.
- **km/L** = trip distance ÷ `liters` of the current fill-up.
- **Trip summary** = sum of baht / liters, count of records, and distance
  (`endOdometer − startOdometer` when both present).

## Storage

- `@capacitor/preferences` for records, vehicles, trips (JSON).
- Photos: Camera captures → save to device gallery → store the resulting
  `photoUri` reference in the record. Display via `Capacitor.convertFileSrc`.
  (URIs may not be guaranteed stable long-term; acceptable for personal use — a
  missing image degrades gracefully to a placeholder.)

## Services

- `records.service.ts` — CRUD for `FuelRecord` and `Vehicle` over Preferences;
  ordered queries, filters by vehicle/trip.
- `trips.service.ts` — start/end trip, get active trip, trip summaries.
- `stats.service.ts` — aggregate analytics (totals, averages, km/L) with
  period + vehicle + trip filters.
- Existing `camera.service.ts` and `meter-onnx.service.ts` kept as-is.
  `ocr.service.ts` (legacy Tesseract) remains unused.

## Screens

### Scan tab

1. Camera / Gallery action (`ion-fab` or `ion-button`).
2. Image drawn on canvas → `meter-onnx.autoReadAllFields` reads the 3 fields
   (baht, liters, price/L).
3. Editable form (`ion-list` + `ion-input`): baht, liters, price/L, plus
   optional odometer and vehicle select (`ion-select`).
   - Cross-check: if `baht ÷ liters` deviates from `pricePerLiter`, show a
     warning chip; do not block saving.
4. Auto-detect failure → fall back to manual ROI drag (existing canvas logic).
5. **Active-trip banner**: if a trip is active, show "🧳 ทริป: <name>" with an
   end-trip button. Saved records auto-tag `tripId`.
6. **Save** → write `FuelRecord`, save photo to gallery, toast confirmation,
   reset for the next scan.

### History tab

- `ion-list` grouped by month.
- `ion-item-sliding` per record for edit / delete.
- Filter by vehicle and/or trip (`ion-select` or `ion-segment`).
- Tap a record → detail modal (photo + editable fields).

### Stats tab

- `ion-segment` for period (month / year / all) plus vehicle/trip filter.
- Cards: total ฿, this-month ฿, average ฿/L, total liters, average km/L
  (when odometer data exists).
- Visualization: simple bars/lists initially (no heavy chart dependency).

### Settings tab

- **Vehicles**: list + add/edit modal (`ion-list`, `ion-modal`).
- **Trips**: navigates to a Trips page — list active + ended trips, "เริ่มทริปใหม่"
  (name + vehicle + optional start odometer); tap a trip → summary; end trip
  prompts for optional end odometer.
- **Export CSV**: share records via the share sheet.
- **Clear data**: destructive, with confirmation.
- **About / model warm-up**.

## Trips behavior

- Exactly one active trip at a time (global). Starting a new one while another
  is active prompts the user to end the current trip first; the new trip is not
  started until the active one is ended.
- Active trip controls reachable from both the Scan banner (quick end) and the
  Trips page (start/end).
- Ending a trip optionally records end odometer, then shows the summary.

## Error handling

- OCR failure → manual ROI fallback (existing behavior preserved).
- Invalid/empty numeric fields on save → inline validation; block save until
  baht and liters are valid numbers (price/L can be derived if missing).
- Missing photo URI on display → placeholder, no crash.
- Preferences read returning no data → treat as empty collections.

## Testing

- Unit: `records.service` CRUD round-trip, `stats.service` aggregations
  (totals, ฿/L, km/L from odometer diffs), `trips.service` active-trip and
  summary logic, baht/liters/price cross-check.
- Component smoke: each page renders and tab navigation works.
- Manual: full scan→edit→save→history→stats flow on device; trip start/tag/end;
  CSV export.

## Migration / impact

- Existing in-memory `history` array in `home.page.ts` is replaced by persisted
  records; no migration needed (no prior persisted data).
- `home/` page logic relocates into `scan/`; old `home` route removed.
- New Capacitor dependency: `@capacitor/preferences`; run `npx cap sync` after
  install.
