---
title: DS-Patterns
status: active
derived_from: src/app/home/home.page.html flow
last_updated: 2026-06-30
---

# Composition Patterns — Meter Scan

> How DS components compose into the core capture→ROI→read→save flow.
> Patterns reference SEMANTIC tokens + cataloged components only.

## P1. Capture → ROI → Read → Save flow

Single-screen pipeline on the scan page:

```
[Empty State] --pick(camera/gallery)--> [Crop Canvas + auto-detect]
   |                                          |
   |                              auto fail --> [Manual ROI drag] --Read--> [Digit Readout rows]
   |                                          |                                   |
   +<-- clear/dismiss --------------------- [Re-scan] <----------------------- save --> [History List]
```

- **Surfaces are mutually exclusive** via `*ngIf` (processing | preview | empty | error never co-render except error overlay).
- Footer **persistent** scan-actions bar (Gallery + Scan Meter) anchored with safe-area inset (`--ion-safe-area-bottom`).
- Header dismiss appears only when `currentImage` present.

## P2. Action bar pattern (footer)

- Pair: secondary `outline` Gallery (auto width) + primary `block` Scan Meter (flex:1).
- Gap `--space-3` (12px; code uses 10px → drift, snap to scale).
- Bottom padding = `--space-3` + safe-area inset. Always reachable thumb zone.

## P3. Rescan-actions pattern

- Two `outline size="small"` buttons (Re-scan, Select manually), centered, gap `--space-2`.
- Each must retain ≥44px hit area despite small visual size.

## P4. Result stack pattern

- `.fields-result` = vertical stack of Digit Readout rows, gap `--space-2`.
- Per-field accent color via `--color-accent-reading` left border (decorative; never carries text).
- `no-reading` rows dimmed AND marked semantically (not opacity alone).

## P5. Feedback layering

- Error banner overlays at content top, role `alert`. Empty state and preview never co-exist; error may coexist with preview.
- One live region per state group; avoid double-announcing.

## P6. Mobile-first / offline conventions

- All surfaces single-column, full-width, thumb-reachable controls in footer.
- No network states (app is fully offline) → no loading-from-server skeletons; only on-device processing spinner.
- Safe-area insets honored on footer (notch/home-indicator devices).

---

## Drift notes (off-scale / hardcoded found in code → DS target)

| Found in code | Location | DS target |
|---|---|---|
| `padding: 60px 24px` | processing-overlay, empty-state | `--space-16`(64) `--space-6` |
| `font-size: 88px` (hero icon) | empty-state | exception — large decorative glyph, document as `--icon-hero: 88px` if reused |
| `gap: 10px`, `padding: 10px 16px` | scan-actions | `--space-3` (12) |
| `#2dd36f` literal | field-row border-left | `--color-accent-reading` |
| `#000` / `#fff` literal | crop-canvas / field-row bg | `--color-surface-canvas` / `--color-surface-raised` |
| `rgba(0,0,0,0.08)` | field-row shadow | `--shadow-sm` |
| `var(--ion-color-danger-tint)` bg + `danger` text | error-banner | `--color-surface-danger` + `--color-text-danger` (1.1:1 → 5.28:1) |

> These are **spec targets** for frontend agent. Design does not edit source.
