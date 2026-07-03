---
tags: [type/fix-log]
date: 2026-07-02 21:11
title: Dark mode ion-item stays white — item text invisible (white-on-white)
status: fixed
severity: P1
area: mobile
reported_by: self
related_plan: none
fixed_commit: pending
fixed_in_version: pending
---

# Dark mode ion-item stays white — item text invisible (white-on-white)

## Symptom
User toggles dark mode in Settings. Ionic components switch (background/toolbar darken)
but every `ion-item` keeps a white background while its text turns light/near-white →
text invisible (white-on-white). Dark mode effectively unusable on any list/form page.

## Reproduction
1. OS appearance = Light.
2. Open app → Settings → toggle Dark mode ON.
3. Navigate to any page with `ion-item` (Settings list, Add, History).
4. Expected: dark item background + light text, readable.
   Actual: white item background + light text → text invisible.

## Success Criteria
- [x] Manual dark toggle darkens `ion-item` background + keeps text readable — verify via TC-01
- [x] Light mode (toggle off) unchanged, still correct — verify via TC-02
- [x] Out of scope: OS `prefers-color-scheme` auto-follow (app is explicit manual 2-state per NFR-002), token value/contrast retuning

## Root Cause
Gate mismatch. App uses **class-based** dark mode:
- `src/global.scss:36` imports `@ionic/angular/css/palettes/dark.class.css` (class-driven).
- `src/app/services/theme.service.ts:5,35` toggles `.ion-palette-dark` on `<html>`.

But the app's own **DS semantic overrides** in `src/theme/variables.scss:162` are gated on
`@media (prefers-color-scheme: dark) { :root { … } }` — the **OS media query**, not the
`.ion-palette-dark` class. On manual toggle with OS in Light, the media query never fires, so
`--color-surface-raised` stays `var(--color-neutral-0)` = `#ffffff` (`variables.scss:95,29`) and
`--ion-item-background: var(--color-surface-raised)` (`variables.scss:205`) = white. Meanwhile
`dark.class.css` sets `--ion-text-color` light. → white bg + white text = invisible.
Stale comments at `variables.scss:8,160,161` still reference `dark.system.css` (media), which was
disabled at `global.scss:37` in favor of `dark.class.css` — the SCSS override block was never
migrated to match.

## Vault Context Read
- Settings refactor + dark-mode toggle work (recent: #S620/#S621/#S622, plan-2026-07-02-1526-settings-subpages-darkmode) — theme.service + toggle added there; DS var gate not migrated.

## Before Evidence
- Console / error log: `before-diagnosis.txt` — static CSS gate-mismatch proof (grep of global.scss + theme.service.ts + variables.scss). RED proof.
- Before screenshot: `before-ui-light.png` (baseline, real Chromium render of production build via `www/`).

## After Evidence
- Fix: `src/theme/variables.scss` — gate changed `@media (prefers-color-scheme: dark) { :root {...} }` → `.ion-palette-dark {...}` (selector-only, token values byte-identical). Stale `dark.system.css` comments corrected to `dark.class.css`.
- Build: `build-output.txt` — `npm run build` EXIT=0, 1838ms.
- E2E proof: headless Playwright loaded the actual built `www/` output, toggled `.ion-palette-dark` on `<html>` (same mechanism as `theme.service.ts:35`), read live computed CSS vars + screenshotted:
  - light (no class): `--ion-item-background=#ffffff`, `--color-text-default=#222428` → `before-ui-light.png`
  - dark (class added): `--ion-item-background=#1e1e1e`, `--color-text-default=#ffffff` → `after-ui-dark.png` (item backgrounds dark, all text readable, no white-on-white)
  - light (class removed): reverts exactly to `#ffffff`/`#222428` → `after-ui-light-regression.png`
- Full manifest: `EVIDENCE.md` in same evidence folder.

## Fix Approach
Migrate the dark override block so it fires on the manual class, matching `dark.class.css`.
Change the gate in `src/theme/variables.scss` from `@media (prefers-color-scheme: dark) { :root { … } }`
to `.ion-palette-dark { … }` (Ionic's class-based convention; may also target `:root.ion-palette-dark`).
Keeps all token values identical — only the selector/gate changes. Update the stale
`dark.system.css` comments to `dark.class.css`.

## Affected Files
- `src/theme/variables.scss` — replace `@media (prefers-color-scheme: dark)` gate (line 162) with `.ion-palette-dark` selector; fix stale comments (lines 8, 160, 161).

## Test Cases (พิสูจน์ red→green)
- [x] TC-01: e2e/manual — OS Light + toggle dark ON → `ion-item` computed background = dark (`#1e1e1e`), text readable. PASS after fix (`after-ui-dark.png`, computed `--ion-item-background=#1e1e1e`). Pre-fix this var stayed `#ffffff` (media-query gate never matched manual class) — RED confirmed via root-cause read, GREEN confirmed via live render.
- [x] TC-02: (regression) e2e/manual — toggle dark OFF → light mode `ion-item` = white bg + dark text, unchanged. PASS (`after-ui-light-regression.png`, identical to `before-ui-light.png`).

## Risk
- Low. Selector-only change, token values unchanged. Edge: if any page relied on OS-media auto-dark (none — app is explicit manual). Verify no double-application if `dark.always.css` re-enabled (it is disabled at `global.scss:35`).

## Next
- [x] Implemented via `/ow-implement --from-fix` (route B, P3-escape-hatch used on a P1 by explicit user override — scope was genuinely single-selector/low-risk)
- [x] Build + e2e (headless render) evidence captured, red→green proven
- [x] Fix-log closed: `status: fixed`
- [ ] `/ow-git --bump` — will stamp `fixed_commit`/`fixed_in_version` (currently `pending`)
