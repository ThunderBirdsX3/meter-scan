# Maestro E2E smoke flows

Native-only app (SQLite via `@capacitor-community/sqlite` — no web/PWA store), so Playwright can't
drive it in a browser. Maestro drives the real iOS Simulator / Android Emulator app instead.

## Prereqs

```bash
brew install mobile-dev-inc/tap/maestro
brew install facebook/fb/idb-companion   # iOS driver
```

Build + sync + install to a booted simulator first:

```bash
npm run build && npx cap sync ios
cd ios/App && xcodebuild -project App.xcodeproj -scheme App -configuration Debug \
  -destination "id=<SIMULATOR_UDID>" -derivedDataPath build build
xcrun simctl install <SIMULATOR_UDID> build/Build/Products/Debug-iphonesimulator/App.app
```

## Running

```bash
maestro --udid=<SIMULATOR_UDID> test e2e/maestro/smoke-add-entry.yaml
```

## Flows

- `smoke-add-entry.yaml` — add tab: select vehicle, fill liters/price, save, verify History shows
  the new entry immediately (regression check for the tab-reload bug fixed 2026-07-05: `add.page.ts`
  / `history.page.ts` / `stats.page.ts` now use `ionViewWillEnter`, not `ngOnInit`, since ion-tabs
  keeps tab-root pages alive across switches).
- `smoke-persist-softhide.yaml` — add an entry with brand+fuel type selected, force-quit
  (`stopApp`) + relaunch, verify the entry and its resolved brand name survive (FR-010).
- `smoke-softhide-brand.yaml` — soft-hides a brand directly via `sqlite3` on the simulator's DB
  file, then verifies History/entry-detail still resolve the brand name (FR-005 AC#4 unfiltered
  lookup) while the Add-form brand picker correctly excludes it (filtered lookup).

## Note

These flows assume ad-hoc state seeded during the 2026-07-05 session (a vehicle named
"E2E Test Car", an entry with "20.0 ลิตร"). They're a starting point, not a clean idempotent
suite — tighten selectors / add `clearState: true` + full re-seed if reusing in CI.
