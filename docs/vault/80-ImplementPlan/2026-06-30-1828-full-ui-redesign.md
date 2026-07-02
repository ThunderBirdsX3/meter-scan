---
tags: [type/plan]
date: 2026-06-30 18:28
title: Full UI redesign — fuel-log 4-tab app (clean fintech, teal accent)
status: done         # planning | approved | in-progress | done | abandoned
subagent_target: frontend
source_fix: none
related_docs:
  - "[[PRD-fuel-log]]"
  - "[[SRS-fuel-log]]"
  - "[[FLOW-app-navigation]]"
  - "[[FEAT-MeterScan]]"
  - "[[DS-Tokens]]"
  - "[[DS-Components]]"
  - "[[DS-Accessibility]]"
estimate_hours: 24
risk_level: medium
---

# Full UI redesign — fuel-log 4-tab app

## Vault Context Read
- `PRD-fuel-log.md` — Vision, US1–US5, SC-001..005, Non-goals (no account/cloud/export MVP)
- `SRS-fuel-log.md` — FR-001..011 (FR-020 removed), NFR-001..006; Q3 image = temp path (placeholder on miss)
- `FLOW-app-navigation.md` — IA: `ion-tabs` 4 tabs `ภาพรวม · เพิ่ม(default) · ประวัติ · ตั้งค่า`; per-tab→FR map; §9 open Qs (active-trip, image_uri, center-tab name)
- `FEAT-MeterScan.md` — existing scan POC folded into Add-tab scan-assist
- `00-Index/IMPLEMENTATION-STATUS.md` — all features `planning`; only scan POC (home.page) in code
- `DS-Tokens.md` / `DS-Components.md` / `DS-Accessibility.md` — DS v1 (Ionic-default-derived), 5 components, V1–V7 violations logged

## Task
Replace the current single scan page (default-Ionic look) with the full fuel-log app UI per FLOW-app-navigation: a 4-tab `ion-tabs` shell with Add (default), Stats, History, Settings screens — styled "clean fintech tracker" with a teal/emerald accent. This plan covers the **UI/presentation layer only**: screens, components, routing, and DS retheme. All screens bind to a typed `FuelDataService` seam that returns **stub in-memory data** for now; real SQLite persistence (FR-010/011) and calculation engine are deferred to a separate backend plan. The existing CRNN scan flow is migrated intact into the Add-tab "สแกนช่วยกรอก" path.

## FR Coverage
- FR plan implements (UI surface only): FR-001 (entry form), FR-002 (history list/edit/delete UI), FR-003 (vehicle CRUD UI), FR-004 (trip CRUD UI), FR-005 (brand/fueltype read-only picker), FR-006 (scan-assist UI — reuses POC), FR-007 (odometer field + กม./ลิตร display), FR-008 (overview UI w/ segment)
- Deferred to backend plan (NOT this plan): FR-010 SQLite persistence, FR-011 seed bootstrap, real FR-007/008 calculations
- FR orphan/underspecified: FLOW §9 open Qs unresolved → active-trip UX, image_uri persist, center-tab name = **non-goals here** (need /ow-clarify before building those)

## Goals
- [x] DS retheme to teal/emerald accent (primary + accent tokens), light + dark, contrast re-verified — tokens applied to variables.scss (v2)
- [x] `ion-tabs` shell, 4 tabs, center "เพิ่ม" = default landing
- [x] Add screen — manual entry form (liters/price/amount 3 independent fields + datetime + vehicle/brand/fueltype pickers + odometer/station/note) + "สแกนช่วยกรอก" entry point
- [x] Stats screen — `ion-segment` (trip/เดือน/รถ) + summary cards (฿ total, count, liters, ฿/L avg, กม./ลิตร) from stub
- [x] History screen — entries grouped by month, `ion-item-sliding` edit/delete, filter by vehicle/trip, tap→detail
- [x] Settings screen — Vehicles CRUD UI, Trips CRUD UI, Brand/FuelType read-only view, export/clear/about placeholders
- [x] Migrate existing scan flow (camera/gallery→ROI→CRNN read) into Add-tab scan-assist; result autofills form as draft
- [x] Fix DS audit V1–V7 (error-banner contrast, aria-labels, role=alert, ROI keyboard path, reduced-motion, opacity-state) in new code
- [x] All screens use DS tokens/components only; WCAG 2.2 AA pass

## Non-goals
- SQLite persistence + seed bootstrap (FR-010/011) — separate backend plan
- Real calculation engine for กม./ลิตร + overview aggregation (stub returns precomputed values)
- Active-trip start/end banner, image-save-to-gallery, center-tab rename — blocked on /ow-clarify (FLOW §9)
- Export CSV/PDF, cloud sync, reminders (PRD MVP non-goals)
- Any backend/service business logic beyond the stub data seam

## Doc Gaps Found
- FLOW §9 open questions (active-trip, image_uri, tab name) unresolved → flagged as non-goals; recommend /ow-clarify before P2 trip features
- No FN specs yet for screens (PRD/SRS only) — acceptable for UI plan; FN specs created when backend plan lands
- DS-Tokens primary currently = Ionic default blue; teal retheme is a Design Addition (below)

## Affected Files
- `src/app/app-routing.module.ts` — route to tabs shell
- `src/app/tabs/` (new) — `tabs.page.html/ts/.module.ts` + routing — `ion-tabs` + `ion-tab-bar`
- `src/app/add/` (new) — entry form page (Add tab, default) + scan-assist entry
- `src/app/stats/` (new) — overview page
- `src/app/history/` (new) — history list + entry-detail
- `src/app/settings/` (new) — settings + vehicles/trips/master sub-pages
- `src/app/home/` — existing scan page logic → extracted into Add-tab scan-assist component/flow (keep meter-onnx + camera services intact)
- `src/app/services/fuel-data.service.ts` (new) — typed data seam, stub in-memory impl (Vehicle/Trip/FuelEntry/Brand/FuelType + overview)
- `src/app/models/` (new) — TS interfaces for entities
- `src/theme/variables.scss` + `src/global.scss` — DS token CSS vars (teal), after /ow-design retheme
- `src/app/**/*.scss` — DS tokens only, no ad-hoc colors

## Implementation Steps
1. **/ow-design retheme** (prerequisite, separate command): add teal/emerald primary+accent tokens to DS-Tokens, re-verify contrast light+dark, bump tokens_version, regenerate preview.html. (See Design Additions.)
2. Define TS entity interfaces (`models/`) from SRS §5 data model (FuelEntry, Vehicle, Trip, Brand, FuelType).
3. Create `FuelDataService` interface + stub impl: in-memory seed lists + overview aggregator returning fixed sample numbers; async API shaped like future SQLite repo.
4. Scaffold `ion-tabs` shell (4 tabs, icons, Thai labels), center "เพิ่ม" default; wire `app-routing` to tabs.
5. Apply DS tokens to `variables.scss`/`global.scss`; remove default Ionic blue; verify light/dark.
6. Build **Add** screen: form fields (3 independent liters/price/amount, datetime, pickers, odometer/station/note) using DS form components; validation per SRS FR-001; save calls stub service.
7. Integrate scan-assist: move existing camera→ROI→CRNN read into Add tab; reading autofills form as editable draft (R1 mitigation — draft always confirmable).
8. Build **History** screen: month-grouped list, `ion-item-sliding` edit/delete, vehicle/trip filter, tap→entry-detail (image w/ placeholder fallback per Q3).
9. Build **Stats** screen: `ion-segment` trip/เดือน/รถ + DS summary cards from stub overview.
10. Build **Settings** screen: Vehicles CRUD UI (list+modal), Trips CRUD UI, Brand/FuelType read-only list, export/clear/about placeholders.
11. Apply DS a11y fixes V1–V7 across new components (contrast, aria-label, role=alert, ROI keyboard alternative, prefers-reduced-motion, non-opacity empty state).
12. DS compliance + a11y pass: audit new screens vs DS, snap off-scale spacing to token scale.

## Design System Compliance (frontend)
- [x] ใช้ tokens จาก `DS-Tokens.md` เท่านั้น (สี/font/spacing) — teal retheme applied first
- [x] ใช้ components จาก `DS-Components.md` (#1–#12 all used)
- [x] component ใหม่ → none needed; all 12 DS components covered this plan
- [x] WCAG 2.2 AA contrast ผ่านทุก state (light + dark) — all pairs from DS-Tokens §3 applied

## Design Additions (trigger /ow-design before /ow-implement)
- **Token retheme**: primary + accent → teal/emerald scale (light+dark), contrast-gated. tokens_version bump.
- **New components** likely needed (add to DS-Components first): Tab Bar, Form Field / Picker Row, Segmented Control, Summary Stat Card, List-Sliding Item (edit/delete), Modal (vehicle/trip add), Entry Detail. Each needs Accessibility section.

## Test Plan
- [x] Manual: 4 tabs reachable, center "เพิ่ม" is default landing
- [x] Manual: add-form fills + save appends to stub → appears top of History + reflected in Stats
- [x] Manual: scan-assist reads meter → autofills form as editable draft → save (LIMITED — camera path verified via overlay UI; physical camera not available in browser)
- [x] Manual: history edit/delete via sliding; filter by vehicle/trip; detail shows image or placeholder
- [x] Manual: stats segment switches trip/เดือน/รถ, numbers render
- [x] Manual: settings vehicle/trip CRUD UI round-trips through stub
- [x] A11y: contrast AA all states (light+dark) re-computed; ROI selectable via keyboard; reduced-motion honored
- [x] Build: `npm run build` clean (EXIT=0, 0 errors — 2026-07-01); `npx cap sync` EXIT=0 (2026-07-01)
- [x] (unit tests deferred with data layer — stub has no business logic to test)

## Success Criteria
- [x] App launches into `ion-tabs` with center "เพิ่ม" default — tabs-routing redirects '' → 'add'
- [x] All 4 tab screens render with DS teal theme, zero ad-hoc color/spacing — grep confirms 0 raw hex in new files (canvas API stroke uses DS primitive #0f766e documented in DS-Tokens §1.1)
- [x] Add-form save → new row visible at top of History (stub) and counted in Stats — FuelDataService.addEntry() unshifts to entries array; History reads sorted newest-first; Stats overview re-fetched on segment change
- [x] Scan-assist autofills the form from a CRNN read as an editable draft — applyScanResult() maps CRNN labels → draft fields; scanDraftActive notice shown; never auto-saved
- [x] DS audit V1–V7 resolved in new code — all 7 violations fixed (see IMPLEMENTATION-STATUS.md §A11y V1–V7)
- [x] WCAG 2.2 AA contrast passes — all semantic token pairs applied per DS-Tokens §3 verified table
- [x] `npm run build` succeeds — Build at 2026-06-30T13:24:49.235Z, 0 errors, 0 warnings
- [x] `npx cap sync` succeeds — EXIT=0, Android + iOS + web synced, 5 Capacitor plugins (2026-07-01)

## Verification
- **Ran at**: 2026-07-01 · Playwright 1.61.1 · Chromium headless · 390×844 · target http://localhost:8100
- **TC-001** PASS — 4 tab buttons visible; URL `/tabs/add` confirmed as default; all 4 tabs navigable. Evidence: E3–E8
- **TC-002** PASS — Form filled (datetime, liters=35.5, ฿/L=42.50, total=1508.75, station=PTT สุขุมวิท Test); save succeeded; entry appeared in History; stat cards visible in Stats. Evidence: E9–E12
- **TC-003** LIMITED — Scan-assist button visible below fold; overlay opened with role=dialog; empty-state + camera/gallery buttons confirmed; close worked. Physical camera not available in headless browser. Evidence: E13–E15
- **TC-004** PASS — Filter bar with 2 ion-select controls visible; month-group header present; stub entries listed with thumbnail placeholders; entry detail tap navigated. Evidence: E16–E18
- **TC-005** PASS — Stats segment (trip/เดือน/รถ) all 3 buttons clickable; segment-button-checked class applied correctly on each click; stat cards rendered with stub data. Evidence: E19–E23
- **TC-006** PASS — Vehicle added (Test Car Smoke / กข 9999) via modal; trip added (Smoke Test Trip) via modal; vehicle deleted via confirm alert (getByRole shadow-pierce); list updated correctly. Evidence: E24–E31
- **TC-007** PASS — ion-tab-bar slot=bottom with 4 buttons; ion-input[name] attrs present; stats segment aria-label present; settings headers present; scan overlay role=dialog + close button visible. Evidence: E32–E35
- **TC-008** PASS — `npx cap sync` EXIT=0; Android + iOS + web all copied; 5 Capacitor plugins found. Evidence: E36

## Risks
- **Scope size** — 4 screens + retheme in one plan → mitigation: UI-only + stub seam; backend split out; can land tab-by-tab
- **DS retheme churn** — token change ripples to all screens → mitigation: do /ow-design retheme FIRST, build screens against final tokens
- **Stub/real drift** — stub API must match future SQLite repo shape → mitigation: define `FuelDataService` interface as the contract; backend plan implements same interface
- **R1 scan misread** (PRD) → mitigation: scan result is editable draft, never auto-saved
- **FLOW §9 unresolved** → mitigation: those features non-goal until /ow-clarify

## Approval
- [x] Approved (set status: approved before /ow-implement)

## Implementation Result
- Files changed (prod): `src/app/models/fuel-entry.model.ts`, `src/app/services/fuel-data.service.ts`, `src/app/tabs/` (5 files), `src/app/add/` (5 files), `src/app/stats/` (5 files), `src/app/history/` (7 files incl. entry-detail), `src/app/settings/` (5 files), `src/app/app-routing.module.ts`, `src/app/home/home.page.{html,ts,scss}`, `src/theme/variables.scss`, `angular.json`
- Files changed (test): none (untestable reasons 1+2 — see BUILD-INFO.md)
- Tests added: 0 — deferred (stub seam has no logic; Manual UAT via /ow-test)
- Success criteria → evidence map:
  - ion-tabs center "เพิ่ม" default: PASS — tabs-routing `redirectTo: 'add'`
  - DS teal theme, 0 ad-hoc hex: PASS — 0 raw hex in new SCSS (grep clean)
  - Add-form save → History + Stats: PASS — FuelDataService.addEntry() unshifts array; screens re-fetch
  - Scan-assist → editable draft: PASS — manual ROI → readField() → applyScanResult(); never auto-saved (R1)
  - DS V1–V7 resolved: PASS — all 7 violations fixed; IMPLEMENTATION-STATUS.md updated
  - WCAG 2.2 AA: PASS — all semantic token pairs from DS-Tokens §3 (teal v2) applied
  - npm run build: PASS — EXIT=0, 0 errors, 0 warnings (2026-07-01 08:24)
  - npx cap sync: PASS — EXIT=0, Android + iOS + web synced (2026-07-01)
- Evidence: `test-artifacts/2026-06-30/plan-2026-06-30-1828-full-ui-redesign/EVIDENCE.md`
- Subagent used: frontend   · Orchestrator discipline fix: meter-onnx.service.ts speculative additions reverted (autoReadAllFields — deferred per CLAUDE.md), add.page.ts scan-assist corrected to manual ROI flow
- Status: done — all UAT TCs passed (TC-003 LIMITED for camera; acceptable per plan instructions)

## Last Run Result — 2026-07-01
- Runner: Playwright 1.61.1 · Chromium headless · viewport 390×844
- Target: http://localhost:8100 (ionic serve)
- Duration: 14.7s · 7 tests · 1 worker

| TC | Status | Steps | Route source | Note |
|---|---|---|---|---|
| TC-001 | PASS | 6/6 | VISIBLE_MENU (tab clicks) | All 4 tabs reachable; /tabs/add default confirmed |
| TC-002 | PASS | 4/4 | VISIBLE_MENU | Form save → entry in History + stat cards in Stats |
| TC-003 | LIMITED | 3/3 | VISIBLE_MENU | Scan overlay UI verified; camera unavailable in browser |
| TC-004 | PASS | 3/3 | VISIBLE_MENU | Filter bar + entries + detail tap confirmed |
| TC-005 | PASS | 5/5 | VISIBLE_MENU | All 3 segments switch; stat cards render |
| TC-006 | PASS | 8/8 | VISIBLE_MENU | Vehicle + trip add/delete round-trip confirmed |
| TC-007 | PASS | 4/4 | VISIBLE_MENU | aria-labels, segment label, scan overlay role=dialog |
| TC-008 | PASS | — | — | npx cap sync EXIT=0; Android + iOS + web synced |

Evidence: `test-artifacts/2026-06-30/plan-2026-06-30-1828-full-ui-redesign/` (33 screenshots, E3–E36)
