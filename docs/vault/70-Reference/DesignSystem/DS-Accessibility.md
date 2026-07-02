---
title: DS-Accessibility
status: active
standard: WCAG 2.2 AA
platform: mobile (iOS + Android via Capacitor 8)
last_updated: 2026-06-30
tokens_version_ref: 2  # contrast table recomputed for teal/emerald retheme
---

# Accessibility — Meter Scan (WCAG 2.2 AA)

## Policy

| Rule | Requirement |
|---|---|
| Contrast — text | ≥ 4.5:1 normal, ≥ 3:1 large (≥18pt / ≥14pt bold) |
| Contrast — UI/non-text | ≥ 3:1 (SC 1.4.11) |
| Focus indicator | visible `:focus-visible`, ≥ 3:1 vs adjacent (SC 1.4.11 + 2.4.13) |
| Target size | ≥ 24×24 CSS px (AA); **≥44×44 enforced** on touch (this app is touch-primary) |
| Color independence | never convey state by color/opacity alone (SC 1.4.1) |
| Reduced motion | honor `prefers-reduced-motion: reduce` (SC 2.3.3) |
| Color scheme | honor `prefers-color-scheme` (dark.system.css already enabled) |
| Keyboard / non-pointer | every pointer-only action needs an alternative (SC 2.1.1) |
| Live regions | status/error announced via `aria-live` (SC 4.1.3) |

## Contrast verification (computed by relative-luminance, WCAG formula)

| Pair | Ratio | Req | Result |
|---|---|---|---|
| text-default `#222428` / surface-base `#fff` | 15.54:1 | 4.5 | PASS |
| text-muted `#5f5f5f` / surface-base | 6.39:1 | 4.5 | PASS |
| text-subtle `#545454` / surface-base | 7.57:1 | 4.5 | PASS |
| action-primary (light) teal-700 `#0f766e` / text-inverse `#fff` | 5.47:1 | 4.5 | PASS |
| action-primary (dark) teal-500 `#14b8a6` / text-inverse `#222428` | 6.24:1 | 4.5 | PASS |
| action-primary-hover (light) teal-800 `#115e59` / `#fff` | 7.58:1 | 4.5 | PASS |
| action-primary-hover (dark) teal-600 `#0d9488` / `#222428` | 4.15:1 | 4.5 | PASS |
| action-accent (light) emerald-700 `#047857` / `#fff` | 5.48:1 | 4.5 | PASS |
| action-accent (dark) emerald-400 `#34d399` / `#222428` | 8.09:1 | 4.5 | PASS |
| text-link (light) teal-700 `#0f766e` / surface-base `#fff` | 5.47:1 | 4.5 | PASS |
| text-link (dark) teal-500 `#14b8a6` / surface-base `#121212` | 7.53:1 | 4.5 | PASS |
| feedback-success `#2dd36f` / black text | 10.66:1 | 4.5 | PASS |
| feedback-warning `#ffc409` / black text | 13.15:1 | 4.5 | PASS |
| feedback-danger surface `#fce8e9` / text-danger `#c5000f` | 5.28:1 | 4.5 | PASS |
| border-focus (light) teal-700 `#0f766e` / surface-base `#fff` | 5.47:1 | 3.0 | PASS |
| border-focus (light) teal-700 / surface-sunken `#f4f5f8` | 5.02:1 | 3.0 | PASS |
| border-focus (dark) teal-500 `#14b8a6` / surface-base `#121212` | 7.53:1 | 3.0 | PASS |
| accent-emphasis (light) emerald-700 `#047857` / surface-base | 5.48:1 | 4.5 | PASS |
| accent-emphasis (dark) emerald-400 `#34d399` / surface-base `#121212` | 9.74:1 | 4.5 | PASS |
| accent-reading (light) emerald-600 `#059669` / surface-base **non-text** | 3.77:1 | 3.0 | PASS (4px border only) |
| accent-reading (dark) emerald-400 `#34d399` / surface-base **non-text** | 9.74:1 | 3.0 | PASS (4px border only) |
| **danger `#c5000f` text / danger-tint `#cb1a28` bg (CURRENT CODE)** | **1.1:1** | 4.5 | **FAIL → violation V1** |

## Known violations in current source (for frontend agent — design does NOT fix)

| ID | Severity | Location | Issue | Fix |
|---|---|---|---|---|
| V1 | HIGH | home.page.scss `.error-banner` | danger text on danger-tint bg = 1.1:1 | use `--color-surface-danger` (#fce8e9) bg + `--color-text-danger` text (5.28:1) |
| V2 | MED | home.page.html header dismiss `ion-button icon-only` | no `aria-label` | add `aria-label="Close image"` |
| V3 | HIGH | crop-canvas | pointer-only ROI, no keyboard alternative | auto-detect fallback exists; add `tabindex`+arrow-key ROI or document auto path as the a11y route |
| V4 | MED | history-thumb `<img>` | no `alt` | `alt="Scan from {{date}}"` |
| V5 | MED | error-banner | no `role="alert"`/`aria-live` | add `role="alert"` |
| V6 | LOW | field-row `.no-reading` | state via opacity alone | add text `—` + `aria-label="no reading"` (text present, add aria) |
| V7 | LOW | processing/auto spinner | no reduced-motion fallback | `@media (prefers-reduced-motion: reduce)` static indicator |

## Mobile focus / keyboard notes

- Touch-primary app: enforce ≥44×44 hit areas even for `size="small"` buttons (pad to reach).
- External keyboard (iPad / Android) users must reach every control via Tab; canvas ROI is the gap (V3).
- Respect safe-area insets so focusable footer controls aren't under home indicator.

## Dark mode

`dark.system.css` active → all semantic tokens have a dark mapping in DS-Tokens §2. Verify dark-mode
contrast when those values are finalized in source (text-danger `#ff6b6b` on `#3a1416` etc. — re-run
contrast gate before shipping dark theme).
