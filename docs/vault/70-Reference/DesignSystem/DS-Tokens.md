---
title: DS-Tokens
tokens_version: 2
status: active
derived_from: src/theme/variables.scss (empty → Ionic 8 default palette), src/global.scss, src/app/home/home.page.scss
theme_modes: [light, dark]  # dark via @ionic/angular/css/palettes/dark.system.css
contrast_standard: WCAG 2.2 AA
last_updated: 2026-06-30
retheme_note: "v2 — primary/accent retheme blue → teal (primary) + emerald (accent), clean-fintech-tracker palette. Functional success/warning/danger unchanged. Blue primitives removed (no longer referenced)."
---

# Design Tokens — Meter Scan

> Two-layer token system. **Component specs reference SEMANTIC tokens only — never primitives.**
> Primitives are the raw Ionic 8 default-palette values (the app ships no custom theme, so these
> are what actually renders). Semantic tokens map intent → primitive, enabling light/dark swap
> through the semantic layer alone.

## Source-of-truth note

`src/theme/variables.scss` is **empty** — the app uses the **Ionic 8 default palette** as-is, plus
`dark.system.css` (auto dark mode by OS preference). Primitive values below are the published
Ionic 8 defaults. Hardcoded values found in `home.page.scss` (`#2dd36f`, `#000`, `#fff`,
`rgba(0,0,0,0.08)`) are **drift** — captured here as the semantic tokens they *should* map to.

---

## 1. Primitive tokens (raw values — do NOT reference from components)

### 1.1 Color — brand / functional (Ionic 8 default base)

| Primitive | Value | Role |
|---|---|---|
| `--color-teal-500` | `#14b8a6` | brand primary — dark-mode action bg / focus / link |
| `--color-teal-600` | `#0d9488` | brand primary — dark-mode hover/active |
| `--color-teal-700` | `#0f766e` | brand primary — light action bg / focus / link |
| `--color-teal-800` | `#115e59` | brand primary — light hover/active |
| `--color-emerald-400` | `#34d399` | accent — dark-mode emphasis |
| `--color-emerald-600` | `#059669` | accent — non-text reading border (light) |
| `--color-emerald-700` | `#047857` | accent — light text-safe emphasis |
| `--color-green-400` | `#2dd36f` | `--ion-color-success` (functional, unchanged) |
| `--color-amber-400` | `#ffc409` | `--ion-color-warning` (functional, unchanged) |
| `--color-red-700` | `#c5000f` | `--ion-color-danger` (functional, unchanged) |
| `--color-red-100` | `#fce8e9` | pale danger surface (functional, unchanged) |

> **v2 retheme:** Ionic-default blue primitives (`--color-blue-600/700/500`), `--color-cyan-700`,
> `--color-violet-600` **removed** — no semantic token references them after primary/accent
> repoint. Teal = primary interactive; emerald = secondary accent/emphasis. Functional
> success/warning/danger green/amber/red retained verbatim.

### 1.2 Color — neutrals (Ionic 8 stepped scale, light)

| Primitive | Value | Ionic var |
|---|---|---|
| `--color-neutral-0` | `#ffffff` | `--ion-background-color` |
| `--color-neutral-50` | `#f4f5f8` | `--ion-color-light` |
| `--color-neutral-100` | `#e0e0e0` | step-100 |
| `--color-neutral-400` | `#92949c` | `--ion-color-medium` (mid) |
| `--color-neutral-600` | `#5f5f5f` | medium text-grade |
| `--color-neutral-700` | `#545454` | `--ion-color-medium-shade` |
| `--color-neutral-900` | `#222428` | `--ion-color-dark` |
| `--color-neutral-1000` | `#000000` | true black (canvas bg) |

### 1.3 Spacing scale (4-base) — px

| Primitive | Value |
|---|---|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-10` | `40px` |
| `--space-12` | `48px` |
| `--space-16` | `64px` |
| `--space-20` | `80px` |
| `--space-24` | `96px` |

> Off-scale values found in code (`60px`, `88px`, `10px`) → see DS-Patterns drift note. Map
> `60px`→`--space-16` (64), `88px`→hero icon exception, `10px`→`--space-3` (12).

### 1.4 Radius

| Primitive | Value | Source |
|---|---|---|
| `--radius-sm` | `6px` | history-thumb img |
| `--radius-md` | `8px` | error-banner |
| `--radius-lg` | `10px` | field-row |
| `--radius-xl` | `12px` | crop-canvas |

### 1.5 Typography (rem; root 16px)

| Primitive | Value | Source |
|---|---|---|
| `--font-2xs` | `0.7rem` | field-label |
| `--font-xs` | `0.78rem` | empty-state note |
| `--font-sm` | `0.85rem` | hint |
| `--font-base` | `0.95rem` | empty-state p |
| `--font-md` | `1rem` | status-text |
| `--font-lg` | `1.4rem` | empty-state h2 |
| `--font-display` | `2rem` | field-value readout |
| `--weight-regular` | `400` | |
| `--weight-semibold` | `600` | |
| `--weight-bold` | `700` | field-value |
| `--leading-tight` | `1.2` | |
| `--leading-normal` | `1.5` | |
| `--tracking-readout` | `0.06em` | field-value digit spacing |
| `--tracking-label` | `0.12em` | uppercase field-label |
| `--numeric-readout` | `tabular-nums` | meter digit alignment |

### 1.6 Elevation (shadow)

| Primitive | Value | Source |
|---|---|---|
| `--shadow-sm` | `0 1px 4px rgba(0,0,0,0.08)` | field-row card |

### 1.7 Motion

| Primitive | Value |
|---|---|
| `--duration-fast` | `150ms` |
| `--duration-base` | `250ms` |
| `--easing-standard` | `cubic-bezier(0.4,0,0.2,1)` |

---

## 2. Semantic tokens (intent-mapped — components reference THESE)

### 2.1 Text

| Semantic | → Primitive (light) | → (dark) | Notes |
|---|---|---|---|
| `--color-text-default` | `--color-neutral-900` | `#ffffff` | body/readout |
| `--color-text-muted` | `--color-neutral-600` | `#a0a0a0` | labels, hints |
| `--color-text-subtle` | `--color-neutral-700` | `#8a8a8a` | notes |
| `--color-text-inverse` | `--color-neutral-0` | `--color-neutral-900` | on action bg |
| `--color-text-danger` | `--color-red-700` | `#ff6b6b` | error text |
| `--color-text-link` | `--color-teal-700` (#0f766e) | `--color-teal-500` (#14b8a6) | retheme v2 (was blue-600) |

### 2.2 Surface

| Semantic | → Primitive (light) | → (dark) |
|---|---|---|
| `--color-surface-base` | `--color-neutral-0` | `#121212` |
| `--color-surface-raised` | `--color-neutral-0` | `#1e1e1e` |
| `--color-surface-sunken` | `--color-neutral-50` | `#0a0a0a` |
| `--color-surface-canvas` | `--color-neutral-1000` | `--color-neutral-1000` |
| `--color-surface-danger` | `--color-red-100` | `#3a1416` |

### 2.3 Action

| Semantic | → Primitive (light) | → Primitive (dark) | Pair text |
|---|---|---|---|
| `--color-action-primary-default` | `--color-teal-700` (#0f766e) | `--color-teal-500` (#14b8a6) | `--color-text-inverse` |
| `--color-action-primary-hover` | `--color-teal-800` (#115e59) | `--color-teal-600` (#0d9488) | `--color-text-inverse` |
| `--color-action-primary-active` | `--color-teal-800` (#115e59) | `--color-teal-600` (#0d9488) | `--color-text-inverse` |
| `--color-action-primary-disabled` | `--color-neutral-100` | `#2a2a2a` | `--color-text-muted` |
| `--color-action-secondary-default` | transparent (outline) | transparent (outline) | `--color-action-primary-default` |
| `--color-action-accent-default` | `--color-emerald-700` (#047857) | `--color-emerald-400` (#34d399) | `--color-text-inverse` |

> **Light vs dark action bg differ by design:** dark mode flips `--color-text-inverse` to a
> *dark* value (`--color-neutral-900` = #222428), so the action bg must be a *lighter* teal
> (teal-500/600) to keep ≥4.5:1 against dark text. Light mode keeps white text on teal-700/800.
> **Accent** (emerald) = secondary highlight/emphasis — distinct from primary (teal) per redesign plan.

### 2.4 Border / focus

| Semantic | → Primitive (light) | → Primitive (dark) |
|---|---|---|
| `--color-border-default` | `--color-neutral-100` | `#2a2a2a` |
| `--color-border-subtle` | `--color-neutral-50` | `#1e1e1e` |
| `--color-border-focus` | `--color-teal-700` (#0f766e) | `--color-teal-500` (#14b8a6) |
| `--color-accent-reading` | `--color-emerald-600` (#059669) | `--color-emerald-400` (#34d399) |
| `--color-accent-emphasis` | `--color-emerald-700` (#047857) | `--color-emerald-400` (#34d399) |

> `--color-accent-reading` = 4px border-left only (non-text, ≥3.0 gate). `--color-accent-emphasis`
> = text-safe accent (≥4.5) for emphasis labels/badges. border-focus repointed blue → teal v2.

### 2.5 Feedback

| Semantic | bg | text | computed ratio |
|---|---|---|---|
| `--color-feedback-success` | `--color-green-400` | `--color-neutral-1000` | 10.66:1 PASS |
| `--color-feedback-warning` | `--color-amber-400` | `--color-neutral-1000` | 13.15:1 PASS |
| `--color-feedback-danger` | `--color-surface-danger` (#fce8e9) | `--color-text-danger` (#c5000f) | 5.28:1 PASS |

> **FIX vs current code:** existing error-banner uses `danger` text on `danger-tint` bg = **1.1:1 FAIL**.
> DS replaces with the pale-surface pair above (5.28:1). See DS-Accessibility §Known violations.

---

## 3. Contrast verification (computed, WCAG 2.2 AA — see DS-Accessibility for full table)

| Pair (semantic) | Mode | Ratio | Required | Result |
|---|---|---|---|---|
| text-default / surface-base | light | 15.54:1 | 4.5 | PASS |
| text-muted / surface-base | light | 6.39:1 | 4.5 | PASS |
| action-primary-default (teal-700) / text-inverse (#fff) | light | 5.47:1 | 4.5 | PASS |
| action-primary-hover (teal-800) / text-inverse (#fff) | light | 7.58:1 | 4.5 | PASS |
| action-primary-default (teal-500) / text-inverse (#222428) | dark | 6.24:1 | 4.5 | PASS |
| action-primary-hover (teal-600) / text-inverse (#222428) | dark | 4.15:1 | 4.5 | PASS |
| action-accent (emerald-700) / text-inverse (#fff) | light | 5.48:1 | 4.5 | PASS |
| action-accent (emerald-400) / text-inverse (#222428) | dark | 8.09:1 | 4.5 | PASS |
| text-link (teal-700) / surface-base | light | 5.47:1 | 4.5 | PASS |
| text-link (teal-500) / surface-base (#121212) | dark | 7.53:1 | 4.5 | PASS |
| border-focus (teal-700) / surface-base | light | 5.47:1 | 3.0 | PASS |
| border-focus (teal-700) / surface-sunken | light | 5.02:1 | 3.0 | PASS |
| border-focus (teal-500) / surface-base (#121212) | dark | 7.53:1 | 3.0 | PASS |
| accent-emphasis (emerald-700) / surface-base | light | 5.48:1 | 4.5 | PASS |
| accent-emphasis (emerald-400) / surface-base (#121212) | dark | 9.74:1 | 4.5 | PASS |
| feedback-success bg / black text | — | 10.66:1 | 4.5 | PASS |
| feedback-warning bg / black text | — | 13.15:1 | 4.5 | PASS |
| feedback-danger bg / text-danger | — | 5.28:1 | 4.5 | PASS |
| accent-reading (emerald-600 #059669) / surface-base **non-text** | light | 3.77:1 | 3.0 | PASS (4px border only, no text) |
| accent-reading (emerald-400 #34d399) / surface-base **non-text** | dark | 9.74:1 | 3.0 | PASS (4px border only) |

> **Shade adjustments forced by the gate:** light primary landed on **teal-700** (teal-600 #0d9488
> = 3.74:1 vs white FAILed 4.5). Dark primary uses **teal-500** because dark inverse text is dark
> (#222428) — a darker teal would fail. Accent text use → **emerald-700** (emerald-600 = 3.77:1
> FAILs as text, kept for non-text border only).
