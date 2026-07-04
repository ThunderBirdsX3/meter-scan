---
tags: [type/plan]
date: 2026-07-03 22:40
title: Delete orphaned home/ module to unblock karma test gate
status: done
completed_at: 2026-07-03 22:52
subagent_target: mobile
source_fix: "[[2026-07-03-2233-orphaned-home-blocks-karma]]"
related_docs:
  - IMPLEMENTATION-STATUS.md (§Tooling debt, §A11y V1–V7)
  - "[[2026-07-03-2233-orphaned-home-blocks-karma]]"
  - "[[2026-07-03-2208-vehicle-fuel-autofill]]"
  - CLAUDE.md (architecture — scan moved home/ → add/)
estimate_hours: 0.25
risk_level: low
---

# Delete orphaned home/ module to unblock karma test gate

## Vault Context Read
- `IMPLEMENTATION-STATUS.md` §Tooling debt (L108) — already recommends deleting unrouted `src/app/home/`; §A11y V1–V7 (L74–84) — V1/V2/V3/V4/V5/V6/V7 fixes duplicated in `add.page`/`entry-detail` (home/ copies redundant, scan lives in add now)
- Fix-log `[[2026-07-03-2233-orphaned-home-blocks-karma]]` — Symptom / Root Cause / Fix Approach / Affected Files / Test Cases ingested below
- `[[2026-07-03-2208-vehicle-fuel-autofill]]` — plan whose new specs were blocked by this karma compile abort
- CLAUDE.md — `src/app/home/` = pre-fuel-log scan page; scan since moved to `src/app/add/add.page.ts` (`MeterOnnxService.readField()`)

## Task
Delete the orphaned `src/app/home/` directory (6 files) — dead code left from the 4-tab restructure (commit `bda500e`). `home.page.ts` still imports removed type `FieldScan` and calls removed method `autoReadAllFields()` on `MeterOnnxService`. Because `tsconfig.spec.json` blanket-includes `**/*.spec.ts`, `home.page.spec.ts` pulls broken `home.page.ts` into the TS program → **whole karma compile aborts, 0 specs run repo-wide**. Prod build (`www/`) never references home so it passes. Removing the dir unblocks the test gate with zero runtime impact.

## FR Coverage
- FR implemented by this plan: none (test-infra/dead-code cleanup, not a feature)
- FR touched/at-risk: FR-006 (Meter scan) — **not affected**; scan feature already lives in `add.page`, home/ is a stale duplicate
- FR orphan/underspecified found: none new (this is escalated from an existing fix-log)

## Goals
- [x] `ng test --watch=false --browsers=ChromeHeadless` compiles + runs specs (no abort) — 32 specs execute (was 0)
- [x] `add.page.spec.ts` + `vehicles.page.spec.ts` execute and go green — 32/32 (add.page.spec needed inline FormsModule fix, see Impl Result)
- [x] `src/app/home/` fully removed (6 files)

## Non-goals
- ห้ามแตะ `meter-onnx.service.ts` API (no restore of `FieldScan` / `autoReadAllFields`)
- ห้ามย้าย/สร้าง scan feature ใหม่ — already in `add.page`
- ไม่แก้ ESLint OOM issue (separate tooling-debt item, out of scope)
- ไม่แตะ `tsconfig.spec.json` (delete chosen over exclude-glob)

## Doc Gaps Found
- IMPLEMENTATION-STATUS §A11y V1–V7 table cites `home.page.scss/html` as fix locations — will be stale after delete. Non-blocking (same fixes exist in `add.page`/`entry-detail`); `/ow-implement` should note the table references dead files but need not rewrite history rows.

## Affected Files
- `src/app/home/home.page.ts` — DELETE (dead, broken API refs: `FieldScan`, `autoReadAllFields`)
- `src/app/home/home.page.html` — DELETE
- `src/app/home/home.page.scss` — DELETE
- `src/app/home/home.page.spec.ts` — DELETE (the spec that drags broken .ts into karma program)
- `src/app/home/home.module.ts` — DELETE
- `src/app/home/home-routing.module.ts` — DELETE

## Implementation Steps
1. Re-confirm orphan: grep `home.module` / `home/home` / `HomePageModule` across `src/app` outside `src/app/home/` → expect 0 (verified in plan research: no inbound refs, no route in `app-routing`/`tabs-routing`).
2. `rm -rf src/app/home/` (all 6 files).
3. Run `ng test --watch=false --browsers=ChromeHeadless` → compile passes, specs run (TC-01 green).
4. Run `npm run build` → EXIT=0, 0 TS error (TC-02 regression).
5. `/ow-implement` closes fix-log: set `status: fixed`, tick TC-01/TC-02.

## Test Plan
- [x] TC-01 (red→green): `ng test --watch=false` — was FAIL (compile abort, 2× TS error); after delete → PASS, 32/32 (`add.page.spec` + `vehicles.page.spec` execute green). Evidence: test-output.txt
- [x] TC-02 (regression): `npm run build` EXIT=0, 0 TS error; 4 tabs intact — nothing references home. Evidence: build-output.txt
- [x] Manual: N/A by construction — deleted module was unrouted (0 inbound refs); Add-tab scan uses `readField` in `add.page` (untouched); build EXIT=0 confirms compile. Interactive UAT deferred to `/ow-test`

## Success Criteria
- [x] `ng test --watch=false --browsers=ChromeHeadless` exits 0 with ≥1 spec executed (32 executed, EXIT=0)
- [x] `home.page.ts:4` `TS2305 FieldScan` + `home.page.ts:85` `TS2339 autoReadAllFields` errors gone from test compile
- [x] `npm run build` EXIT=0, 0 TS errors
- [x] `src/app/home/` directory absent (`ls src/app/home` → no such dir)

## Verification
- SC1/SC2 ← TC-01 output (spec count > 0, no TS2305/TS2339)
- SC3 ← TC-02 build exit code
- SC4 ← `ls`/`git status` shows 6 deletions, dir gone

## Risks
- **Losing a reference scan page** → mitigation: restorable from git history (fix-log cites initial commit; recheck exact SHA before restore). Low value — scan already reimplemented in `add.page`.
- **Hidden dynamic reference** (string-based lazy import) → mitigation: Step 1 grep incl. `HomePageModule`/`loadChildren` before delete; prod build (TC-02) would fail if any real route existed.

## Approval
- [x] Approved (set status: approved before /ow-implement)

## Implementation Result
- **Files changed (prod / test):**
  - prod (deleted): `src/app/home/{home.page.ts, home.page.html, home.page.scss, home.module.ts, home-routing.module.ts}` (5) + `home.page.spec.ts` (6th, test)
  - test (fixed): `src/app/add/add.page.spec.ts` — added `FormsModule` import to TestBed (out-of-Affected-Files; user-approved scope extension per Goal #2). Root cause: template `#entryForm="ngForm"` + `[(ngModel)]` → `NG0301` without FormsModule; masked until karma compiled
- **Tests added/modified:** `add.page.spec.ts` (FormsModule import — unblocks 6 auto-fill specs). No new production logic (delete only) → covered by regression gate
- **Success criteria → evidence map:**
  - SC1 ✅ → test-output.txt (32/32, EXIT=0)
  - SC2 ✅ → test-output.txt (clean compile, no TS2305/TS2339)
  - SC3 ✅ → build-output.txt (EXIT=0)
  - SC4 ✅ → git status (6× `D`), `ls src/app/home` → No such dir
- **Evidence:** `test-artifacts/2026-07-03/plan-2026-07-03-2240-delete-orphaned-home-module/EVIDENCE.md` (manifest — gitignored)
- **Subagent used:** none (orchestrator inline — pure deletion, zero code authored) · Time: ~12 min
- **Doc note:** IMPLEMENTATION-STATUS §A11y V1–V7 rows still cite deleted `home.page.scss/html` as fix locations — now stale (same fixes live in `add.page`/`entry-detail`). History rows left as-is per Doc Gaps decision.
