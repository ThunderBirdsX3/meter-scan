---
tags: [type/plan]
date: 2026-07-02 15:26
title: Settings เป็นเมนูปุ่ม → หน้าจัดการแยก (รถ/ทริป/แบรนด์) + toggle dark mode
status: done
subagent_target: mobile
related_docs:
  - "[[FLOW-app-navigation]]"
  - "[[SRS-fuel-log]]"
  - "[[PRD-fuel-log]]"
  - "[[DS-Tokens]]"
  - "[[DS-Components]]"
estimate_hours: 5
risk_level: medium
---

# Settings เป็นเมนูปุ่ม → หน้าจัดการแยก + toggle dark mode

## Vault Context Read
- `[[FLOW-app-navigation]]` — §4 Navigation map (T4 → VEH/TRIP/MASTER), §5 Tab 4 ตั้งค่า (ปัจจุบันระบุ CRUD inline: list + modal)
- `[[SRS-fuel-log]]` — FR-003 (Vehicle CRUD), FR-004 (Trip CRUD + active), FR-005 (Brand/FuelType read-only), NFR-002 (on-device/privacy)
- `[[PRD-fuel-log]]` — US3/US4 (จัดการรถ/ทริป), Non-goals
- `[[DS-Tokens]]` — theme_modes [light, dark]; dark ปัจจุบันมาจาก `dark.system.css`; contrast light+dark ผ่าน AA ครบ (ไม่ต้องเพิ่ม token)
- `[[DS-Components]]` — ไม่มี component "theme toggle" / "settings menu row" อยู่ก่อน
- Code ปัจจุบัน: `src/app/settings/settings.page.{ts,html,scss}` (จัดการ vehicles/trips inline ผ่าน ion-modal), `src/app/settings/{vehicles,trips,master-data}/` (โฟลเดอร์ว่างเปล่า — scaffold ค้าง), `src/app/tabs/tabs-routing.module.ts`, `src/app/services/fuel-data.service.ts` (มี get/add/update/delete Vehicle+Trip, getBrands, getFuelTypes), `src/global.scss` (import `dark.system.css`)

## Task
ปรับหน้า "ตั้งค่า" จากที่จัดการ รถ/ทริป/แบรนด์ แบบ inline (list + modal ในหน้าเดียว) → เป็น **เมนูปุ่ม**: แต่ละรายการกดแล้ว navigate ไปหน้าจัดการแยก (`/tabs/settings/vehicles`, `/tabs/settings/trips`, `/tabs/settings/master-data`). ย้าย logic CRUD vehicle/trip ไปหน้าที่เกี่ยวข้อง; brand/fuel type = หน้าดูอย่างเดียว. เพิ่ม **toggle dark mode แบบ 2-state (สว่าง/มืด)** ในหน้าตั้งค่า เก็บค่าถาวรด้วย Capacitor Preferences และ apply ตอนเปิดแอป.

## FR Coverage
- FR ที่ plan นี้แตะ (relocate เท่านั้น ไม่เปลี่ยน behavior): **FR-003** (Vehicle CRUD), **FR-004** (Trip CRUD), **FR-005** (Brand/FuelType read-only view)
- FR orphan/underspecified: **Dark mode toggle ไม่มี FR รองรับใน SRS** — เป็นฟีเจอร์ใหม่ (underspecified). Plan ทำตาม decision ของ user; ควร escalate เพิ่ม FR ใหม่ (เช่น FR-012 Appearance/Theme) ผ่าน `/ow-clarify` หรือ `/ow-doc SRS` (ดู Doc Gaps)

## Goals
- [x] หน้า "ตั้งค่า" = รายการปุ่มเมนู (ion-item button + detail) ไม่มี CRUD inline อีกต่อไป
- [x] กด "รถของฉัน" → หน้า `vehicles` (list + add/edit modal + delete) — ย้าย logic เดิมมาครบ
- [x] กด "ทริป" → หน้า `trips` — ย้าย logic เดิมมาครบ
- [x] กด "แบรนด์และประเภทน้ำมัน" → หน้า `master-data` แสดง brand + fuel type แบบ read-only (FR-005)
- [x] toggle dark mode (สว่าง/มืด) ในหน้าตั้งค่า → สลับ theme ทันที + จำค่าไว้ข้าม session
- [x] preference โหลด + apply ตอน app start (ก่อน render แรกไม่ควรกระพริบผิดธีม)

## Non-goals
- ไม่เพิ่ม system/auto theme option (user เลือก 2-state; system option = backlog)
- ไม่ทำ active-trip start/end UX (FR-004 ส่วนขยาย) — นอก scope task นี้
- ไม่แก้ schema / data model / FuelDataService signatures (reuse เดิมทั้งหมด)
- ไม่ทำ export/clear-data (ยังเป็น placeholder เดิม)

## Doc Gaps Found
- `[[FLOW-app-navigation]]` §5 Tab 4 ระบุ "Vehicles/Trips CRUD (list + modal)" ในหน้า settings เอง — ขัดกับ IA ใหม่ (settings = เมนู → sub-page). ต้องอัปเดต §4 mermaid + §5 ให้สะท้อน sub-page navigation → `/ow-implement` เรียก `docs` subagent แก้
- ไม่มี FR/section สำหรับ theme/appearance ใน `[[SRS-fuel-log]]` — dark mode เป็น gap (เสนอเพิ่ม FR-012 + NFR หรือ note ใน §UX). `/ow-implement` ควร flag ให้เติม SRS
- ไม่มี DS-Components spec สำหรับ "settings menu row" และ "theme toggle" — ถ้าต้อง log design addition ก่อน (ดู Design Additions)

## Affected Files
- `src/global.scss` — เปลี่ยน `@import ".../palettes/dark.system.css"` → `dark.class.css` (manual class-based dark mode)
- `src/app/services/theme.service.ts` — **ใหม่** — `@Injectable({providedIn:'root'})`; `init()` โหลด pref (Capacitor Preferences key `theme`), apply `.ion-palette-dark` บน `document.documentElement`; `setDark(boolean)` persist + apply; `isDark()` getter
- `src/app/app.component.ts` — เรียก `ThemeService.init()` ตอน bootstrap (ก่อน UI แสดง) — ถ้าไม่มีไฟล์นี้ ใช้ `APP_INITIALIZER` ใน `app.module.ts`
- `src/app/settings/settings.page.ts` — ลบ vehicle/trip/brand CRUD logic ทั้งหมด; เหลือ nav methods + `darkMode` getter/setter ผูก ThemeService
- `src/app/settings/settings.page.html` — แทน list/modal ด้วยเมนู 3 ปุ่ม (รถ/ทริป/แบรนด์) + section "การแสดงผล" มี ion-toggle dark mode + section ทั่วไป (about/placeholder เดิม)
- `src/app/settings/settings.page.scss` — ลบ style ของ list/modal ที่ไม่ใช้; เก็บ/ปรับ menu + toggle
- `src/app/settings/settings-routing.module.ts` — เพิ่ม child routes: `vehicles`, `trips`, `master-data` (lazy-load module ย่อย)
- `src/app/settings/vehicles/vehicles.page.{ts,html,scss}` + `vehicles.module.ts` + `vehicles-routing.module.ts` — **ใหม่** — ย้าย vehicle CRUD (list + modal + delete alert) จาก settings เดิมมาครบ
- `src/app/settings/trips/trips.page.{ts,html,scss}` + `trips.module.ts` + `trips-routing.module.ts` — **ใหม่** — ย้าย trip CRUD มาครบ
- `src/app/settings/master-data/master-data.page.{ts,html,scss}` + `master-data.module.ts` + `master-data-routing.module.ts` — **ใหม่** — read-only view: brand list + fuel type (จาก getBrands/getFuelTypes)
- `package.json` — เพิ่ม `@capacitor/preferences` (npm install)

## Implementation Steps
1. ติดตั้ง `@capacitor/preferences` (`npm install @capacitor/preferences`) — ใช้เก็บ theme pref (สอดคล้อง NFR-002 on-device)
2. สร้าง `ThemeService`: key `theme` = `'dark' | 'light'`; `init()` อ่าน pref (default `'light'` ถ้าไม่มีค่า), toggle class `ion-palette-dark` บน `<html>`; `setDark(v)` เขียน pref + apply ทันที
3. `src/global.scss`: สลับ import จาก `dark.system.css` → `dark.class.css` (ทำให้ dark ควบคุมด้วย `.ion-palette-dark` แทน OS)
4. เรียก `ThemeService.init()` ตอน startup (app.component `ngOnInit` หรือ `APP_INITIALIZER`) เพื่อ apply ก่อน UI แสดง
5. สร้างหน้า `vehicles` (module + routing + page): ย้าย vehicles list + add/edit modal + delete alert + logic จาก settings.page เดิมมาไว้ที่นี่ (มี ion-header + back button); reuse `FuelDataService` เดิม
6. สร้างหน้า `trips` แบบเดียวกัน: ย้าย trip CRUD ทั้งหมด
7. สร้างหน้า `master-data` (read-only): แสดง brand + fuel type ที่ group ตาม brand จาก `getBrands()`/`getFuelTypes()`; ไม่มีปุ่มแก้/ลบ (FR-005)
8. เพิ่ม child routes ใน `settings-routing.module.ts` (`vehicles`/`trips`/`master-data` lazy-load)
9. เขียนหน้า `settings.page` ใหม่เป็นเมนู: section "จัดการข้อมูล" = 3 ปุ่ม navigate (`routerLink` หรือ NavController) → sub-page; section "การแสดงผล" = ion-toggle "โหมดมืด" ผูก `ThemeService`; section "ทั่วไป" = about + placeholders เดิม
10. ลบ CRUD logic/HTML/SCSS ที่ย้ายออกไปแล้วจาก settings.page ให้เหลือเฉพาะเมนู + toggle
11. ตรวจ nav stack: กดปุ่มในแท็บ settings → push sub-page ใน tab outlet, back กลับหน้า settings ได้; แท็บ bar ยังอยู่ (ตามพฤติกรรม Ionic child route)

## Design System Compliance (mobile)
- [x] ใช้ tokens จาก `DS-Tokens.md` เท่านั้น — dark mode ใช้ palette ที่ DS สเปคไว้แล้ว (contrast AA ผ่านครบ ไม่เพิ่มสีใหม่)
- [x] ใช้ Ionic components ตาม `DS-Components.md` (ion-item, ion-toggle, ion-list) — ไม่สร้างสี/spacing ad-hoc
- [x] ต้อง component ใหม่ (settings menu row / theme toggle) → log ใน "Design Additions" ก่อน (treated เป็น plain Ionic composition ตาม plan's Design Additions note — ข้าม formal DS log ได้ตามที่ user อนุญาตไว้ล่วงหน้า)
- [x] WCAG AA contrast ผ่านทั้ง 2 ธีม (toggle state, menu row focus) (reuse DS-Tokens palette ที่ verify AA ไว้แล้ว — ไม่มีสีใหม่)

## Design Additions (ถ้ามี)
- "Settings menu row" (ion-item button + icon + detail chevron) — pattern ใหม่ ควร log ใน DS-Patterns/Components ผ่าน `/ow-design` ก่อน implement (ถ้าต้องการ formal); ถ้า treat เป็น plain Ionic composition อาจข้ามได้ — ให้ user/`/ow-design` ตัดสิน
- "Theme toggle row" (ion-item + ion-toggle) — เช่นเดียวกัน

## Test Plan
- [x] Manual: หน้าตั้งค่าแสดงเมนู 3 ปุ่ม + toggle + about; ไม่มี CRUD inline — PASS, runtime verified 2026-07-05 (iPhone 16 sim, iOS 18.5, throwaway Maestro flow `uat-01`)
- [x] Manual: กดแต่ละปุ่ม → ไปหน้าที่ถูกต้อง, back กลับได้, แท็บ bar คงอยู่ — PASS, runtime verified 2026-07-05 (`uat-02`; Maestro edge-swipe back didn't register on this sim/Maestro combo, worked around by tapping back button's `aria-label` directly — not an app regression)
- [x] Manual FR-003: หน้า vehicles เพิ่ม/แก้/ลบรถได้ (เท่าเดิม), delete มี confirm — PASS, runtime verified 2026-07-05 (`uat-03`)
- [x] Manual FR-004: หน้า trips เพิ่ม/แก้/ลบทริปได้ (เท่าเดิม) — PASS, runtime verified 2026-07-05 (`uat-04`)
- [x] Manual FR-005: หน้า master-data แสดง brand+fuel type อย่างเดียว ไม่มีปุ่มแก้/ลบ — PASS, runtime verified 2026-07-05 (screenshot + template check, zero click handlers in `master-data.page.html`)
- [x] Manual dark mode: toggle → ทั้งแอปเปลี่ยนธีมทันที; ปิด/เปิดแอปใหม่ → ธีมคงเดิม (persist) — PASS, runtime verified 2026-07-05 (`uat-06`: Settings/History/Overview/Add all screenshotted dark; `stopApp`+relaunch confirmed persisted)
- [x] Manual: เปิดแอปครั้งแรก (ไม่มี pref) → ธีม default light ไม่กระพริบ — PASS (steady-state only), runtime verified 2026-07-05 via `simctl uninstall`+reinstall+launch+screenshot. Caveat: single screenshot can't prove absence of a transient flash frame, only that settled state is light.
- [x] Build ผ่าน (`npm run build`) + `npx cap sync` ไม่ error — PASS, rebuilt fresh 2026-07-05 (EXIT=0, `xcodebuild` BUILD SUCCEEDED)

## Success Criteria
- [x] หน้า settings ไม่มี ion-modal/CRUD ของ vehicle/trip อีก (grep ยืนยัน) — เหลือเมนู + toggle (verified: grep zero matches, Phase 5.3)
- [x] มี 3 route ทำงาน: `/tabs/settings/vehicles`, `/tabs/settings/trips`, `/tabs/settings/master-data` (navigate + back ได้จริง) — **runtime verified 2026-07-05** on iPhone 16 sim (iOS 18.5), all 3 routes navigate + back correctly, tab bar stayed visible/functional throughout
- [x] vehicle/trip CRUD ทำงานครบเท่าเดิมในหน้าใหม่ (add/edit/delete + validation ชื่อว่าง) — **runtime verified 2026-07-05**: add/edit/delete + delete-confirm dialog all PASS on both vehicles and trips sub-pages
- [x] master-data แสดง brand+fuel type read-only (ไม่มี mutation UI) (verified: no button/click handlers in template, static code check)
- [x] toggle dark mode สลับธีมได้ + ค่าคงอยู่หลัง restart (Capacitor Preferences key `theme`) — **runtime verified 2026-07-05**: toggle flips whole app immediately, survives force-quit (`stopApp`) + relaunch
- [x] `npm run build` ผ่าน, ไม่มี TS error (verified: EXIT=0, build-output.txt)

## Verification
- Runtime UAT completed 2026-07-05 on iPhone 16 simulator (iOS 18.5, UDID `C983E782-59CA-432A-B52E-0AE02281951F`), dispatched via test-runner subagent. Fresh rebuild (`npm run build` → `npx cap sync ios` → `xcodebuild` Debug/simulator, EXIT=0/BUILD SUCCEEDED) + reinstall before testing.
- Evidence: `test-artifacts/2026-07-05/uat-settings-darkmode/` — 18 screenshots, `MANIFEST.md`, `BUILD-INFO.md`, `flows/` (5 throwaway Maestro YAMLs used to drive taps). All screenshots checked for PII — synthetic fuel-log data only, `safe_to_share: true`.
- All 8 Test Plan items + all 5 Success Criteria now PASS with real runtime evidence — no fabricated ticks. **Status flipped to `done`.**

## Risks
- **Nested routing ในแท็บ** — sub-page ต้อง push ใน tab's ion-router-outlet ให้ back + tab bar ทำงานถูก → mitigation: ใช้ child routes ใต้ settings-routing + ทดสอบ nav จริง
- **ธีมกระพริบตอน start** (apply pref ช้ากว่า first paint) → mitigation: apply class ใน `init()` แบบ synchronous เร็วสุด (APP_INITIALIZER / ต้น app.component); pref read เป็น async — อาจต้อง set class จาก cached ค่าเร็วที่สุด
- **DS/SRS gap** (dark mode ไม่มี FR, FLOW ระบุ inline) → mitigation: `/ow-implement` เรียก docs subagent แก้ FLOW + เสนอเพิ่ม FR ก่อน lock
- **`dark.system.css` → `dark.class.css`** เปลี่ยนพฤติกรรม dark เดิม (เคย auto ตาม OS) → mitigation: ตั้งใจ (user ต้องการ manual); default light จนกว่าจะ toggle

## Approval
- [x] Approved (set status: approved before /ow-implement)

## Implementation Result (code complete, status flipped to done 2026-07-05 — see Verification section)
- Files changed (prod): `src/global.scss`, `src/app/services/theme.service.ts` (new), `src/app/app.component.ts`, `src/app/settings/settings.page.{ts,html,scss}`, `src/app/settings/settings-routing.module.ts`, `src/app/settings/vehicles/*` (new, 5 files), `src/app/settings/trips/*` (new, 5 files), `src/app/settings/master-data/*` (new, 5 files), `package.json` (+`@capacitor/preferences`)
- Files changed (test): none — no automated test infra exists anywhere in this repo (0 `.spec.ts` files for any page, pre-existing). See §Coverage Audit below.
- Doc gaps closed (Phase 2, before implementation): `FLOW-app-navigation` §4/§5 IA updated to sub-page nav; `SRS-fuel-log` FR-012 stub added flagging dark mode as an unreviewed post-hoc gap
- Build: `npm run build` → ✅ EXIT=0, 0 TS errors, all 4 expected lazy chunks present (`vehicles-vehicles-module`, `trips-trips-module`, `master-data-master-data-module`, `settings-settings-module`)
- Evidence: `test-artifacts/2026-07-02/plan-2026-07-02-1526-settings-subpages-darkmode/EVIDENCE.md` + `BUILD-INFO.md`
- Coverage Audit (§5.2): 11 prod files / 0 test files. No untestable-reason (1–6) cleanly applies — this is real logic, not styling/config/generated/static/third-party/docs. **User was presented this gate finding directly and chose "manual-only, document gap"** over spawning a subagent to bootstrap net-new Angular test infrastructure (out of plan scope). Accepted as a known, flagged limitation.
- **Status flipped to `done` 2026-07-05**: all 11 previously-open boxes (Test Plan + Success Criteria) closed with real runtime evidence via test-runner subagent on iPhone 16 simulator — see Verification section above for evidence path.
- Subagent used: mobile (implementation) + docs (doc gaps) · Time: ~7 min combined agent runtime
