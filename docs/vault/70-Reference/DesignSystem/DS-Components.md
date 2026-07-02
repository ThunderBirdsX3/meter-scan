---
title: DS-Components
components_version: 2
status: active
derived_from: src/app/home/home.page.html, src/app/home/home.page.scss
framework: Ionic 8 + Angular 20 (NgModule, standalone:false)
last_updated: 2026-06-30
catalog_note: "v2 — added #6–#12 (Tab Bar, Form Field/Picker Row, Segmented Control, Summary Stat Card, List-Sliding Item, Modal, Entry Detail) for plan 2026-06-30-1828-full-ui-redesign (4-tab fuel-log). All semantic-token-only; no new tokens required."
---

# Component Catalog — Meter Scan

> Components actually present on the scan page (`home.page.html`). Built on Ionic primitives
> (`ion-button`, `ion-list`, etc.) — DS specs constrain how they're themed + composed.
> **All tokens referenced are SEMANTIC.** Accessibility section is MANDATORY per component.

---

## 1. Action Button (`ion-button`)

**Purpose**
When to use: primary scan/read actions, secondary re-scan/gallery, header dismiss.
When NOT: in-content navigation (none in this app), text links.

**Anatomy**
- Container — Ionic `ion-button`; touch target ≥ 44×44 CSS px (mobile primary).
- Leading `ion-icon` (`slot="start"` or `icon-only`).
- Label.

**Variants** (style intent)
- `primary` — `fill="solid" color="primary"` → `--color-action-primary-default`. Scan Meter, Read selected.
- `secondary` — `fill="outline"` → `--color-action-secondary-default`. Gallery, Re-scan, Select manually.
- `dismiss` — `icon-only` in header. Close current image.

**Sizes**
- `default` — height 44 (Ionic md), padding-x `--space-4`.
- `small` — `size="small"`, height 32; reserved for paired rescan-actions ONLY (still must keep ≥44px hit area via padding — see Accessibility).
- `block` — `expand="block"` full-width primary CTA.

**States**
default · hover · active · focus-visible · disabled (`[disabled]` during processing/autoDetecting) · loading (page-level spinner, not in-button)

**Props** (Ionic-mapped)
| name | type | default | required | description |
|---|---|---|---|---|
| `fill` | `'solid'\|'outline'` | `'solid'` | no | style intent |
| `size` | `'default'\|'small'` | `'default'` | no | |
| `expand` | `'block'\|undefined` | — | no | full width |
| `color` | `'primary'` | — | no | semantic action color |
| `disabled` | `boolean` | `false` | no | blocks during processing |
| `(click)` | handler | — | yes | |

**Accessibility**
- role: `button` (native via `ion-button`).
- ARIA: icon-only dismiss MUST have `aria-label="Close image"` (currently MISSING in code — see DS-A11y known violations).
- Keyboard: Enter + Space activate.
- Focus: `:focus-visible` outline `--color-border-focus`, 2px, ≥3:1 (computed 6.1:1 PASS).
- Target size: ≥44×44 px. `size="small"` rescan buttons must add padding to reach 44px hit area on touch.
- Reduced motion: ripple respects `prefers-reduced-motion: reduce`.

**Tokens used** (semantic)
- bg: `--color-action-primary-default` / hover / active / disabled
- text: `--color-text-inverse` (solid) / `--color-action-primary-default` (outline)
- focus: `--color-border-focus`; radius: `--radius-md`; spacing: `--space-4`.

**Example (Angular template)**
```html
<ion-button expand="block" color="primary" (click)="pick(true)" [disabled]="isProcessing">
  <ion-icon name="camera-outline" slot="start"></ion-icon>
  Scan Meter
</ion-button>
```

**Don't**
- ✗ icon-only button without `aria-label`.
- ✗ hardcode colors — use `color="primary"` / semantic tokens.
- ✗ `size="small"` with <44px hit area on touch surface.

---

## 2. ROI Crop Canvas (`<canvas class="crop-canvas">`)

**Purpose**
When to use: display captured photo + let user drag a selection box over the meter number for OCR.
When NOT: static image display (use `ion-thumbnail`/`img`).

**Anatomy**
- Full-width `<canvas>`, `--radius-xl`, bg `--color-surface-canvas` (black).
- Pointer-drawn selection rectangle overlay.
- Mode toggle: `.manual-mode` → `cursor: crosshair`.

**Variants**
- `auto` — auto-detect running (read-only, dots spinner above).
- `manual` — user drags ROI (`crosshair`).

**States**
idle · drawing (pointerdown→move) · selected (`hasSelection`) · disabled (`autoDetecting`)

**Props** (component inputs / pointer events)
| name | type | default | required | description |
|---|---|---|---|---|
| `manualMode` | `boolean` | `false` | no | enables drag |
| `hasSelection` | `boolean` | `false` | no | gates Read button |
| `(pointerdown/move/up/leave)` | handler | — | yes | drag lifecycle |

**Accessibility**
- role: `img` with `aria-label` describing captured meter; selection is a custom widget.
- **Keyboard alternative REQUIRED:** canvas drag is pointer-only → MUST provide keyboard/arrow-key ROI adjustment OR an auto-detect fallback (auto-detect exists). Flag: no keyboard path to set ROI today (DS-A11y violation V3).
- Focus: canvas focusable (`tabindex="0"`) with visible `--color-border-focus` ring.
- Target size: ROI handles ≥24×24 px; whole canvas is large tap area.
- Reduced motion: no animated selection; static rectangle.
- Instructions: visible hint text ("Drag a box over the number, then tap Read") — keep, it aids all users.

**Tokens used**
- bg: `--color-surface-canvas`; radius: `--radius-xl`; selection stroke: `--color-action-primary-default`.

**Don't**
- ✗ rely on color alone to indicate selection — use stroke + dimming.
- ✗ ship pointer-only with no auto-detect/keyboard fallback.

---

## 3. Digit Readout / Field Row (`.field-row` + `.field-value`)

**Purpose**
When to use: display a recognized meter number (the core output).
When NOT: free-form text.

**Anatomy**
- Row container `--radius-lg`, `--shadow-sm`, bg `--color-surface-raised`, left accent border 4px `--color-accent-reading`.
- `.field-label` — uppercase, `--font-2xs`, `--tracking-label`, `--color-text-muted`.
- `.field-value` — `--font-display`, `--weight-bold`, `--numeric-readout` (tabular), `--tracking-readout`, `--color-text-default`.
- `.no-reading` state → opacity 0.45 when value is `—`.

**Variants**
- `read` — has value.
- `no-reading` — placeholder `—`, dimmed.

**States**
read · no-reading (dimmed)

**Props**
| name | type | default | required | description |
|---|---|---|---|---|
| `label` | `string` | — | yes | field name |
| `text` | `string` | — | yes | digits or `—` |
| `accentColor` | token | `--color-accent-reading` | no | per-field accent |

**Accessibility**
- role: group; `.field-label` + `.field-value` associated (use `aria-labelledby` or visually-paired DOM).
- **Do NOT convey state by opacity alone** — `no-reading` MUST also expose text `—` + `aria-label="no reading"` (opacity 0.45 alone fails non-text perception).
- Contrast: text-default on surface-raised = 15.54:1 PASS. Muted label = 6.39:1 PASS.
- `tabular-nums` ensures digit alignment for low-vision scanning.
- Reduced motion: no animation.

**Tokens used**
- bg `--color-surface-raised`; text `--color-text-default` / `--color-text-muted`; accent `--color-accent-reading`; radius `--radius-lg`; shadow `--shadow-sm`.

**Don't**
- ✗ use accent-reading green for the digit text (1.97:1 FAIL) — accent is border-only.
- ✗ signal "no reading" with opacity alone.

---

## 4. History List Item (`ion-item` in `ion-list`)

**Purpose**
When to use: chronological list of past scans with thumbnail + readings + timestamp.

**Anatomy**
- `ion-list-header` "Scan History".
- `ion-item` → `ion-thumbnail` (`--radius-sm` img) + `ion-label` (readings stack + timestamp).
- `.history-reading` — `--font-sm`, `--weight-semibold`, tabular, `--color-text-default`.

**Variants** none (single density).

**States** default · pressed (Ionic ripple).

**Props**
| name | type | default | required |
|---|---|---|---|
| `imageUrl` | `string` | — | yes |
| `fields` | `{label,text}[]` | `[]` | yes |
| `timestamp` | `Date` | — | yes |

**Accessibility**
- role: `listitem` within `list` (native via ion-list).
- Thumbnail `<img>` MUST have `alt` (e.g. "Scan from {date}") — currently MISSING (V4).
- Timestamp readable; reading contrast 15.54:1 PASS.
- Touch target: full `ion-item` row ≥44px.
- Reduced motion: Ionic ripple respects reduce.

**Tokens used**
- text `--color-text-default` / `--color-text-muted`; radius `--radius-sm`; lines `--color-border-default`.

**Don't**
- ✗ image without `alt`.
- ✗ rely on thumbnail alone to identify a scan — readings text present.

---

## 5. Feedback Banner / Empty State / Spinner

**Purpose**
Status surfaces: error banner, empty hero, processing overlay.

**Anatomy**
- Error banner — icon + message, bg `--color-surface-danger`, text `--color-text-danger`, `--radius-md`.
- Empty state — hero icon (`--color-action-primary-default` @ 0.6 opacity), h2 `--font-lg`, body, note.
- Processing overlay — `ion-spinner` 48px + status text `--color-text-muted`.

**Variants**
- `error` · `empty` · `processing` · `auto-scan` (inline dots spinner).

**States** static (presence-toggled by `*ngIf`).

**Props**
| name | type | required |
|---|---|---|
| `message` / `processingStatus` | `string` | yes |

**Accessibility**
- Error banner: role `alert` (`aria-live="assertive"`) so screen readers announce — currently NOT set (V5). Icon `alert-circle` decorative (`aria-hidden`), text carries meaning.
- Processing/auto-scan: `aria-live="polite"` + `aria-busy`; spinner `aria-hidden`, status text announced.
- **Error MUST NOT rely on color alone** — icon + text present (good). Contrast 5.28:1 PASS (with DS pale surface fix; current code 1.1:1 FAIL → V1).
- Empty hero icon decorative (`aria-hidden`); h2 is the accessible heading.
- Reduced motion: spinner — provide non-spinning fallback under `prefers-reduced-motion: reduce`.

**Tokens used**
- danger bg `--color-surface-danger`, text `--color-text-danger`; muted `--color-text-muted`; spacing `--space-4`/`--space-6`; radius `--radius-md`.

**Don't**
- ✗ danger text on danger-tint bg (1.1:1) — use surface-danger pale pair.
- ✗ silent error with no `aria-live`.
- ✗ infinite spin with no reduced-motion fallback.

---

## 6. Tab Bar (`ion-tabs` + `ion-tab-bar` / `ion-tab-button`)

**Purpose**
When to use: top-level app navigation across the 4 sections (ภาพรวม · เพิ่ม · ประวัติ · ตั้งค่า). Center "เพิ่ม" is the default/emphasized primary action.
When NOT: in-page section switching (use Segmented Control #8); modal/contextual nav.

**Anatomy**
- `ion-tab-bar slot="bottom"` anchored to footer, honoring `--ion-safe-area-bottom` inset.
- 4× `ion-tab-button` (tab="overview|add|history|settings"), each = `ion-icon` + Thai text label.
- Center **เพิ่ม** tab visually emphasized (larger icon / accent treatment) but remains a peer tab button (not a FAB) so it stays in tab order.
- Active tab: icon+label `--color-action-primary-default`; inactive: `--color-text-muted`.

**Variants** (style intent)
- `standard` — overview / ประวัติ / ตั้งค่า, default density.
- `emphasized` — center เพิ่ม, accent emphasis via `--color-accent-emphasis` (text-safe) ring/icon; still a tab.

**Sizes**
- single density; each tab button ≥ 44×44 CSS px hit area (4 tabs share full width, each ≥ 90px wide × ≥56px tall — Ionic md tab bar height).

**States**
inactive · active (selected) · focus-visible · pressed (Ionic ripple). No disabled state (all tabs always reachable).

**Props** (Ionic-mapped)
| name | type | default | required | description |
|---|---|---|---|---|
| `tab` | `'overview'\|'add'\|'history'\|'settings'` | — | yes | route key per button |
| `selectedTab` | `string` | `'overview'` | no | active tab (Ionic manages) |
| `(ionTabsDidChange)` | handler | — | no | tab change hook |

**Accessibility**
- role: `tablist` (`ion-tab-bar`) containing `tab` buttons (native via Ionic).
- ARIA: each `ion-tab-button` exposes accessible name from its visible Thai label; `aria-selected` reflects active (Ionic-managed). Icon decorative (`aria-hidden`), text label carries meaning.
- **Never convey active state by color alone** (SC 1.4.1) — active tab must ALSO change weight (`--weight-semibold`) or show an indicator bar, not just teal vs grey.
- Keyboard: Tab to enter tablist; Arrow keys move between tabs; Enter/Space activate. Every tab keyboard-reachable (addresses general SC 2.1.1; complements V3).
- Focus: `:focus-visible` ring `--color-border-focus`, ≥3:1 (5.47:1 light / 7.53:1 dark PASS).
- Target size: ≥44×44 px per tab (enforced on touch).
- Reduced motion: tab-switch transition + ripple respect `@media (prefers-reduced-motion: reduce)` → no slide, instant swap (addresses V7-class motion).
- Contrast: active `--color-action-primary-default` on `--color-surface-base` = 5.47:1 light / 7.53:1 dark PASS; muted inactive label 6.39:1 PASS.

**Tokens used** (semantic)
- active text/icon: `--color-action-primary-default`; inactive: `--color-text-muted`.
- center emphasis: `--color-accent-emphasis`.
- bar bg: `--color-surface-raised`; top border: `--color-border-default`; focus: `--color-border-focus`.
- weight: `--weight-semibold` (active) / `--weight-regular`; label `--font-2xs`; motion `--duration-fast` + `--easing-standard`.

**Example (Angular template)**
```html
<ion-tabs>
  <ion-tab-bar slot="bottom">
    <ion-tab-button tab="overview"><ion-icon name="pie-chart-outline" aria-hidden="true"></ion-icon><ion-label>ภาพรวม</ion-label></ion-tab-button>
    <ion-tab-button tab="add" class="tab-emphasized"><ion-icon name="add-circle-outline" aria-hidden="true"></ion-icon><ion-label>เพิ่ม</ion-label></ion-tab-button>
    <ion-tab-button tab="history"><ion-icon name="time-outline" aria-hidden="true"></ion-icon><ion-label>ประวัติ</ion-label></ion-tab-button>
    <ion-tab-button tab="settings"><ion-icon name="settings-outline" aria-hidden="true"></ion-icon><ion-label>ตั้งค่า</ion-label></ion-tab-button>
  </ion-tab-bar>
</ion-tabs>
```

**Don't**
- ✗ make center "เพิ่ม" a floating FAB that leaves the tab order — keep it a tab button.
- ✗ signal the active tab with teal color alone — add weight/indicator.
- ✗ hardcode teal hex — use `--color-action-primary-default`.

---

## 7. Form Field / Picker Row (`ion-item` + `ion-input` / `ion-select` / `ion-datetime-button`)

**Purpose**
When to use: a labeled control row in the Add/Edit-entry form — numeric (liters/price/amount/odometer), datetime, and picker (vehicle/brand/fueltype) inputs, plus station/note text.
When NOT: read-only display of a saved value (use Digit Readout #3 or Entry Detail #12).

**Anatomy**
- `ion-item` row, `--radius-lg`, optional `--shadow-sm`, bg `--color-surface-raised`.
- `ion-label` (`position="stacked"`) — `--font-2xs` uppercase or `--font-sm`, `--color-text-muted`.
- Control: `ion-input` (numeric → `inputmode="decimal"`, `--numeric-readout`) / `ion-select` / `ion-datetime-button` (opens datetime in a Modal #11).
- Error slot: helper text below control in `--color-text-danger`, with a leading `aria-hidden` icon.

**Variants** (control type)
- `numeric` — liters/price/amount/odometer (`type="number" inputmode="decimal"`, tabular readout).
- `picker` — `ion-select` for vehicle/brand/fueltype.
- `datetime` — `ion-datetime-button` → datetime Modal.
- `text` — station/note free text.

**Sizes**
single density; control min-height ≥ 44 CSS px touch target.

**States**
default · focused · filled · invalid (error) · disabled. Error and disabled MUST be conveyed beyond color/opacity (see Accessibility).

**Props**
| name | type | default | required | description |
|---|---|---|---|---|
| `label` | `string` | — | yes | field name |
| `controlType` | `'numeric'\|'picker'\|'datetime'\|'text'` | `'text'` | yes | |
| `value` | `string\|number\|Date` | — | no | bound model |
| `required` | `boolean` | `false` | no | |
| `errorText` | `string` | — | no | shown when invalid |
| `disabled` | `boolean` | `false` | no | |
| `(ionChange)` | handler | — | yes | |

**Accessibility**
- role: native form control via Ionic; `ion-label` associated to control (Ionic links label↔input). For `ion-select`/`datetime-button` ensure `aria-label` matches the visible label.
- **Error state MUST NOT rely on color alone** (SC 1.4.1): show `errorText` message + icon + set `aria-invalid="true"` and `aria-describedby` → the error text id. Announce inline error politely; group-level submit errors use Banner #5 `role="alert"` (V5 pattern).
- **Disabled MUST NOT rely on opacity alone** — set `disabled` attr (exposes `aria-disabled`) so AT perceives it, not just dimming.
- Keyboard: every control reachable + operable by Tab/typing; pickers open via Enter/Space; datetime Modal traps + returns focus.
- Focus: `:focus-visible` ring `--color-border-focus` ≥3:1 (5.47:1 PASS).
- Target size: control + tap row ≥44×44 px.
- Numeric: `inputmode="decimal"` for correct mobile keypad; `--numeric-readout` tabular alignment.
- Reduced motion: picker/Modal open transitions respect `prefers-reduced-motion: reduce`.

**Tokens used** (semantic)
- bg `--color-surface-raised`; label `--color-text-muted`; value `--color-text-default`; error `--color-text-danger`; border `--color-border-default`; focus `--color-border-focus`; radius `--radius-lg`; spacing `--space-3`/`--space-4`; numeric `--numeric-readout`.

**Example (Angular template)**
```html
<ion-item [class.ion-invalid]="liters.invalid">
  <ion-label position="stacked">ลิตร</ion-label>
  <ion-input type="number" inputmode="decimal" [(ngModel)]="entry.liters"
             aria-describedby="liters-err" [attr.aria-invalid]="liters.invalid"></ion-input>
</ion-item>
<div id="liters-err" *ngIf="liters.invalid" class="field-error">
  <ion-icon name="alert-circle" aria-hidden="true"></ion-icon> กรอกจำนวนลิตร
</div>
```

**Don't**
- ✗ red border only for errors — add message + `aria-invalid` + `aria-describedby`.
- ✗ disabled via opacity only — set the `disabled` attr.
- ✗ numeric field without `inputmode="decimal"`.

---

## 8. Segmented Control (`ion-segment` + `ion-segment-button`)

**Purpose**
When to use: in-page mutually-exclusive view switch on the Stats screen — trip / เดือน / รถ.
When NOT: top-level app navigation (use Tab Bar #6); multi-select (use checkboxes).

**Anatomy**
- `ion-segment` track, bg `--color-surface-sunken`, `--radius-lg`.
- 2–3 `ion-segment-button`, each a Thai text label.
- Selected indicator: pill/underline using `--color-action-primary-default`; selected label `--color-text-inverse` (on filled pill) or `--color-action-primary-default` (on underline).

**Variants**
- `pill` — selected button gets teal filled pill (text-inverse on it).
- `underline` — selected gets teal underline + teal label.

**Sizes**
single density; each segment button ≥44 px tall, full-width split.

**States**
unselected · selected · focus-visible · pressed. No disabled in this app.

**Props**
| name | type | default | required | description |
|---|---|---|---|---|
| `value` | `'trip'\|'month'\|'vehicle'` | `'trip'` | yes | active segment |
| `variant` | `'pill'\|'underline'` | `'pill'` | no | |
| `(ionChange)` | handler | — | yes | |

**Accessibility**
- role: Ionic `ion-segment` exposes a radiogroup-like pattern; selected button is the checked option. Ensure each button has its visible Thai label as accessible name.
- **Selected state NOT by color alone** (SC 1.4.1) — pill fill + `--weight-semibold` (pill) or underline shape (underline) reinforce beyond teal vs grey.
- Keyboard: Tab into group; Arrow keys move selection; Enter/Space confirm. Fully keyboard-operable.
- Focus: `:focus-visible` ring `--color-border-focus` ≥3:1 (5.47:1 PASS).
- Target size: each segment ≥44×44 px.
- Contrast: pill text-inverse `#fff` on teal-700 = 5.47:1 PASS; underline teal label on surface-sunken = 5.02:1 PASS.
- Reduced motion: indicator slide respects `prefers-reduced-motion: reduce` → instant move, no animated travel.

**Tokens used** (semantic)
- track bg `--color-surface-sunken`; selected `--color-action-primary-default`; selected text `--color-text-inverse` (pill) / `--color-action-primary-default` (underline); unselected `--color-text-muted`; radius `--radius-lg`; focus `--color-border-focus`; weight `--weight-semibold`; motion `--duration-fast`.

**Example (Angular template)**
```html
<ion-segment [(ngModel)]="statsView">
  <ion-segment-button value="trip"><ion-label>Trip</ion-label></ion-segment-button>
  <ion-segment-button value="month"><ion-label>เดือน</ion-label></ion-segment-button>
  <ion-segment-button value="vehicle"><ion-label>รถ</ion-label></ion-segment-button>
</ion-segment>
```

**Don't**
- ✗ use for app-level nav — that's the Tab Bar.
- ✗ indicate selection by teal color alone.
- ✗ animate the indicator without a reduced-motion guard.

---

## 9. Summary Stat Card (`ion-card`)

**Purpose**
When to use: a Stats metric tile — ฿ total, count, liters, ฿/L avg, กม./ลิตร. Label + large numeric readout.
When NOT: actionable rows (use list items); long-form content.

**Anatomy**
- `ion-card`, `--radius-lg`, `--shadow-sm`, bg `--color-surface-raised`.
- `.stat-label` — `--font-2xs` uppercase, `--tracking-label`, `--color-text-muted`.
- `.stat-value` — `--font-display`, `--weight-bold`, `--numeric-readout` (tabular), `--tracking-readout`, `--color-text-default`.
- `.stat-unit` — small suffix (฿, L, กม./ล.) `--font-sm`, `--color-text-muted`.
- Optional emphasis variant: left accent border 4px `--color-accent-reading` (non-text) OR emphasis label `--color-accent-emphasis` (text-safe).

**Variants**
- `default` — neutral tile.
- `emphasized` — highlighted KPI (e.g. ฿ total) using `--color-accent-emphasis` label or accent border.

**Sizes**
- `grid` — half-width tile in a 2-col stats grid.
- `full` — full-width hero KPI.

**States**
static (display only) · `no-data` (placeholder `—`).

**Props**
| name | type | default | required | description |
|---|---|---|---|---|
| `label` | `string` | — | yes | metric name |
| `value` | `string\|number` | — | yes | numeric readout or `—` |
| `unit` | `string` | — | no | suffix (฿, L) |
| `emphasized` | `boolean` | `false` | no | KPI highlight |

**Accessibility**
- role: `group`; associate label + value (`aria-labelledby` or paired DOM). The accessible name should read e.g. "ยอดรวม 1,250 บาท".
- **`no-data` NOT by opacity alone** — render `—` text + `aria-label="ไม่มีข้อมูล"` (mirrors Digit Readout V6 rule).
- Contrast: value text-default on surface-raised = 15.54:1 PASS; muted label 6.39:1 PASS; accent-emphasis label 5.48:1 light / 9.74:1 dark PASS.
- `tabular-nums` for digit alignment across the grid (numbers line up column-wise).
- Target size: card is non-interactive (display) — no hit-target requirement; if made tappable to drill-down, enforce ≥44px + `role="button"`.
- Reduced motion: no count-up animation, or guard it under `prefers-reduced-motion: reduce`.

**Tokens used** (semantic)
- bg `--color-surface-raised`; value `--color-text-default`; label/unit `--color-text-muted`; emphasis `--color-accent-emphasis` / accent border `--color-accent-reading`; radius `--radius-lg`; shadow `--shadow-sm`; `--font-display` / `--weight-bold` / `--numeric-readout` / `--tracking-readout`.

**Example (Angular template)**
```html
<ion-card class="stat-card">
  <span class="stat-label">ยอดรวม</span>
  <span class="stat-value">1,250<span class="stat-unit">฿</span></span>
</ion-card>
```

**Don't**
- ✗ use accent-reading green as the number text color (1.97:1 FAIL) — accent is border-only; use `--color-accent-emphasis` for colored text.
- ✗ signal no-data by dimming alone.
- ✗ non-tabular figures in a stats grid (misaligned columns).

---

## 10. List-Sliding Item (`ion-item-sliding` + `ion-item-options`)

**Purpose**
When to use: a History row that reveals Edit/Delete on swipe.
When NOT: rows with no row-level actions (use plain History List Item #4).

**Anatomy**
- `ion-item-sliding` wrapping the History List Item (#4) content (thumbnail + readings + timestamp).
- `ion-item-options side="end"` → Edit option (neutral/primary) + Delete option (danger).
- Edit `ion-item-option` — `--color-action-primary-default` bg, text-inverse + edit icon.
- Delete `ion-item-option` — `--color-feedback-danger` treatment (danger bg/text), trash icon.

**Variants**
- `swipe-actions` — edit + delete revealed on swipe-end.

**Sizes**
single density; each revealed option ≥44 px wide hit area.

**States**
closed · swiping · open (options revealed) · option pressed.

**Props**
| name | type | default | required | description |
|---|---|---|---|---|
| `imageUrl` | `string` | — | yes | (inherits #4) |
| `fields` | `{label,text}[]` | `[]` | yes | readings |
| `timestamp` | `Date` | — | yes | |
| `(edit)` | handler | — | yes | edit option tapped |
| `(delete)` | handler | — | yes | delete option tapped |

**Accessibility**
- role: `listitem`; sliding options are buttons with explicit accessible names — Edit `aria-label="แก้ไขรายการ"`, Delete `aria-label="ลบรายการ"`. Icons `aria-hidden`.
- **Swipe is pointer-gesture-only → a keyboard/AT alternative is REQUIRED** (SC 2.1.1, mirrors V3): expose the same Edit/Delete as focusable buttons reachable without swipe (e.g. an overflow/kebab menu or always-visible buttons for keyboard users). Flag: do not ship swipe as the sole path.
- **Delete must not rely on red color alone** — provide trash icon + text label, and a confirm step (Modal #11) before destructive action.
- Keyboard: row focusable; actions reachable via the non-swipe alternative; Enter/Space activate.
- Focus: `:focus-visible` ring `--color-border-focus` ≥3:1 PASS.
- Target size: each option ≥44×44 px.
- Contrast: Edit text-inverse on teal-700 = 5.47:1 PASS; Delete uses `--color-feedback-danger` pair (5.28:1 PASS).
- Reduced motion: swipe-reveal + auto-close respect `prefers-reduced-motion: reduce`.

**Tokens used** (semantic)
- edit bg `--color-action-primary-default` / text `--color-text-inverse`; delete `--color-feedback-danger` (bg `--color-surface-danger` + `--color-text-danger`); inherits #4 row tokens; focus `--color-border-focus`; motion `--duration-base`.

**Example (Angular template)**
```html
<ion-item-sliding>
  <ion-item>…history row (component #4)…</ion-item>
  <ion-item-options side="end">
    <ion-item-option (click)="edit(item)" aria-label="แก้ไขรายการ"><ion-icon name="create-outline" aria-hidden="true"></ion-icon></ion-item-option>
    <ion-item-option color="danger" (click)="confirmDelete(item)" aria-label="ลบรายการ"><ion-icon name="trash-outline" aria-hidden="true"></ion-icon></ion-item-option>
  </ion-item-options>
</ion-item-sliding>
```

**Don't**
- ✗ ship swipe as the only way to edit/delete (no keyboard/AT path).
- ✗ delete with red color but no label/icon/confirm.
- ✗ skip the destructive-confirm Modal.

---

## 11. Modal (`ion-modal`)

**Purpose**
When to use: add/edit Vehicle and Trip from Settings — a focused task surface with header + form body + save/cancel.
When NOT: brief transient feedback (use Banner/Toast); top-level nav.

**Anatomy**
- `ion-modal` sheet, bg `--color-surface-base`, `--radius-xl` (top corners for sheet style).
- `ion-header` → `ion-toolbar`: title (`--color-text-default`) + Cancel (start) + Save (end, primary).
- Body: stack of Form Field / Picker Rows (#7).
- Footer (optional) or toolbar-end primary Save `--color-action-primary-default`.

**Variants**
- `add` — empty form, title "เพิ่ม…".
- `edit` — prefilled, title "แก้ไข…", may include destructive Delete (uses feedback-danger).

**Sizes**
- `sheet` — bottom sheet (Ionic `breakpoints`) for quick add.
- `full` — full-screen for longer forms.

**States**
opening · open · saving (Save shows busy) · closing. Save disabled until form valid.

**Props**
| name | type | default | required | description |
|---|---|---|---|---|
| `isOpen` | `boolean` | `false` | yes | presentation |
| `mode` | `'add'\|'edit'` | `'add'` | yes | |
| `title` | `string` | — | yes | |
| `(save)` | handler | — | yes | |
| `(cancel)` / `(ionModalDidDismiss)` | handler | — | yes | |

**Accessibility**
- role: `dialog`, `aria-modal="true"`; `aria-labelledby` → toolbar title id (Ionic sets modal semantics — verify title is the accessible name).
- **Focus management:** on open, move focus into the modal (first field or title); **trap focus** within while open; on dismiss, **return focus** to the trigger control. Esc / backdrop / Cancel all dismiss.
- Keyboard: all fields + Save/Cancel reachable by Tab; Save disabled state exposes `aria-disabled`; Esc cancels.
- **Save disabled NOT by opacity alone** — set `disabled` attr; busy Save exposes `aria-busy="true"`.
- Target size: Save/Cancel ≥44×44 px.
- Contrast: title text-default 15.54:1 PASS; Save text-inverse on teal-700 5.47:1 PASS.
- Reduced motion: sheet enter/leave transition respects `prefers-reduced-motion: reduce` → fade/instant instead of slide.
- Safe-area: footer Save honors `--ion-safe-area-bottom`.

**Tokens used** (semantic)
- bg `--color-surface-base`; title `--color-text-default`; Save `--color-action-primary-default` / `--color-text-inverse`; Cancel `--color-action-secondary-default`; border `--color-border-default`; radius `--radius-xl`; focus `--color-border-focus`; motion `--duration-base` + `--easing-standard`.

**Example (Angular template)**
```html
<ion-modal [isOpen]="vehicleModalOpen" (ionModalDidDismiss)="onDismiss()">
  <ng-template>
    <ion-header><ion-toolbar>
      <ion-title>แก้ไขรถ</ion-title>
      <ion-buttons slot="start"><ion-button (click)="cancel()">ยกเลิก</ion-button></ion-buttons>
      <ion-buttons slot="end"><ion-button color="primary" [disabled]="form.invalid" (click)="save()">บันทึก</ion-button></ion-buttons>
    </ion-toolbar></ion-header>
    <ion-content><!-- Form Field rows (#7) --></ion-content>
  </ng-template>
</ion-modal>
```

**Don't**
- ✗ open a modal without moving + trapping focus, or without returning focus on close.
- ✗ Save disabled via opacity only — set `disabled`.
- ✗ slide animation with no reduced-motion fallback.

---

## 12. Entry Detail

**Purpose**
When to use: single fuel-entry detail view — captured image, field readouts, and edit/delete actions.
When NOT: list context (use #4/#10); form editing (use Modal #11 / Form Field #7).

**Anatomy**
- `ion-header` toolbar: back/dismiss + title + (optional) edit/delete in overflow.
- Image: full-width `<img>`, `--radius-lg`, bg `--color-surface-sunken`.
  - **Placeholder fallback** (SRS Q3 — temp image path may be missing): if image fails/absent, show a placeholder block (icon + "ไม่มีรูปภาพ") instead of broken image.
- Field readouts: stack of Digit Readout rows (#3) for liters/price/amount + meta rows (date, vehicle, station, note) reusing the readout pattern.
- Actions: Edit (primary → opens Modal #11) + Delete (destructive → feedback-danger, confirm first).

**Variants**
- `with-image` — image present.
- `no-image` — placeholder fallback (per SRS Q3 temp-path miss).

**States**
loaded · image-missing (placeholder) · deleting (confirm flow).

**Props**
| name | type | default | required | description |
|---|---|---|---|---|
| `entry` | `FuelEntry` | — | yes | full record |
| `imageUrl` | `string\|null` | `null` | no | null/miss → placeholder |
| `(edit)` | handler | — | yes | opens edit Modal |
| `(delete)` | handler | — | yes | destructive (confirm) |

**Accessibility**
- role: detail content within `ion-content`; heading structure (`<h1>`/`ion-title`) names the entry.
- Image `<img>` MUST have `alt` (e.g. "รูปมิเตอร์ {{date}}"); **placeholder must be perceivable to AT** — placeholder block has text "ไม่มีรูปภาพ" + `aria-label`, NOT a silent empty box (and not color/opacity-only).
- Field readouts inherit #3 rules — label+value associated; `—` for no-reading with `aria-label`, never opacity alone.
- Delete: `aria-label="ลบรายการ"`, requires confirm (Modal/alert) before destroying; not red-color-only.
- Keyboard: back, edit, delete all reachable by Tab; Enter/Space activate; edit Modal traps + returns focus.
- Focus: `:focus-visible` ring `--color-border-focus` ≥3:1 PASS.
- Target size: edit/delete/back ≥44×44 px.
- Contrast: readout text-default 15.54:1 PASS; Edit text-inverse on teal 5.47:1 PASS; Delete feedback-danger 5.28:1 PASS.
- Reduced motion: page transition + any image fade respect `prefers-reduced-motion: reduce`.

**Tokens used** (semantic)
- bg `--color-surface-base`; image bg/placeholder `--color-surface-sunken`; readouts inherit #3 (`--color-text-default` / `--color-text-muted` / `--color-accent-reading`); edit `--color-action-primary-default` / `--color-text-inverse`; delete `--color-feedback-danger`; radius `--radius-lg`; focus `--color-border-focus`; motion `--duration-base`.

**Don't**
- ✗ render a broken/empty image box when the temp path is missing — show the labeled placeholder (SRS Q3).
- ✗ image without `alt`; placeholder without accessible text.
- ✗ delete without a confirm step.
