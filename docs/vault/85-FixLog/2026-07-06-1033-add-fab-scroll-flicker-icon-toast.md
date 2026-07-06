---
tags: [type/fix-log]
date: 2026-07-06 10:33
title: Add page — FAB/inline save toggle flicker interrupts scroll; icon check→save; no save-success feedback
status: fixed
fixed_commit: pending
severity: P2
area: mobile
reported_by: user
related_plan: "[[2026-07-06-0930-add-page-trip-vehicle-autofill-fab-save]]"
---

# Add page — save-toggle flicker interrupts scroll + icon + success feedback

## Symptom
1. **Flicker / scroll interruption** — เมื่อ scroll ลงใกล้ล่างสุดของฟอร์ม ปุ่มบันทึกกระพริบ (FAB↔inline สลับไปมา) และ scroll สะดุด ต้องยกนิ้วออกแล้ว scroll ใหม่หลายครั้งกว่าจะถึงล่างสุด
2. **Icon ผิด** — ปุ่มบันทึกใช้ icon `checkmark-outline` (เครื่องหมายถูก) — user ต้องการ icon `save`
3. **ไม่มี feedback หลังบันทึก** — กด "บันทึก" สำเร็จแล้วฟอร์มถูก reset เงียบๆ ไม่มี toast/alert บอกว่าบันทึกสำเร็จ

## Reproduction
1. เปิดหน้า "เพิ่มการเติมน้ำมัน", ฟอร์มยาวกว่า viewport
2. Scroll ลงช้าๆ เข้าใกล้ล่างสุด → **Actual:** ปุ่มกระพริบ + scroll สะดุด (ต้องยกนิ้ว scroll ซ้ำ). **Expected:** scroll ราบรื่น ปุ่มไม่กระพริบ
3. กรอกฟอร์ม → กดบันทึก → **Actual:** ฟอร์ม reset เงียบ. **Expected:** มี toast/alert "บันทึกสำเร็จ"

## Success Criteria
- [x] Scroll ลงล่างสุดราบรื่น ไม่กระพริบ ไม่สะดุด (ปุ่ม inline อยู่ใน DOM ตลอด, scrollHeight คงที่) — verify via TC-01 ✅ (unit: inline present ทั้ง atBottom=true/false → oscillation source ถูกกำจัด. On-device scroll-feel UAT ยังรอ /ow-test)
- [x] FAB ซ่อนเมื่อถึงปุ่ม inline (opacity/display) แสดงเมื่อยัง scroll ไม่ถึง — verify via TC-02 ✅ (unit: class `is-hidden` toggle + CSS opacity:0/pointer-events:none)
- [x] ปุ่มบันทึก (inline + FAB) ใช้ icon `save`/`save-outline` แทน `checkmark-outline` — verify via TC-03 ✅
- [x] บันทึกสำเร็จ → แสดง toast "บันทึกสำเร็จ" — verify via TC-04 ✅ (ToastController.create/present)
- [x] Regression: TC-01..TC-04 ของ plan เดิม (trip autofill, save wiring, atBottom logic) ยังผ่าน — verify via TC-05 ✅ (85/85 test SUCCESS)
- [x] Out of scope: ไม่แตะ scan modal / autofill logic / data model; ไม่เปลี่ยน gradient/token ของปุ่ม ✅ (diff = 4 ไฟล์ add/ เท่านั้น; `.save-btn`/`.save-fab` background/box-shadow ไม่แตะ)

## Root Cause
**Layout-feedback oscillation จาก `*ngIf` toggle** — `add.page.html`:
- L270 `<div class="submit-section" *ngIf="atBottom">` — ปุ่ม inline **ถูก add/remove ออกจาก DOM** ตาม `atBottom`
- L289 `<ion-fab ... *ngIf="!atBottom">` — FAB toggle ตรงข้าม

เมื่อ scroll ใกล้ boundary: `atBottom` flip → **true** → inline submit-section เข้า DOM → `scrollHeight` โตขึ้น → เงื่อนไข `scrollTop + clientHeight >= scrollHeight - 24` (`add.page.ts:209`) กลายเป็น false → `atBottom` flip → **false** → inline หลุด DOM → `scrollHeight` หด → true อีก → **oscillation**. การ add/remove element กลาง scroll ยัง trigger reflow ที่ตัด momentum scroll (iOS/Android) → ต้องยกนิ้ว scroll ใหม่.

**Icon:** `checkmark-outline` ที่ `add.page.html:280` (inline) + `:297` (FAB).

**No success feedback:** `add.page.ts` `save()` (L217–266) — สำเร็จแล้วทำแค่ `form.resetForm()` + reset draft (L252–260) ไม่มี `ToastController`/alert.

## Vault Context Read
- Plan `[[2026-07-06-0930-add-page-trip-vehicle-autofill-fab-save]]` — feature ต้นทางของ FAB/inline toggle (steps 3–6); fix นี้เป็น follow-up polish หลัง manual UAT พบ flicker
- `src/app/add/add.page.ts:204-213` `updateAtBottom()` — boundary calc; `save()` L217-266
- `src/app/add/add.page.html:270,289` — `*ngIf` toggle (root cause)
- DS-Components — ionic Toast เป็น feedback pattern มาตรฐาน (ToastController)

## Before Evidence
<!-- Evidence folder: test-artifacts/2026-07-06/fix-202607061033-add-fab-scroll-flicker-icon-toast/ (gitignored), EVIDENCE.md manifest -->
- Before code state (RED proof — root-cause code lines): `before-code-state.txt` ✅
- Before screenshot / recording ของ flicker: `pending evidence` (layout-feedback flicker เป็น interaction บน device — capture ตอน manual UAT ใน /ow-test; root cause พิสูจน์ได้จาก code + reasoning แล้ว)

## Fix Approach
1. **หยุด oscillation** — เอา `*ngIf="atBottom"` ออกจาก `.submit-section` (inline อยู่ใน DOM **ตลอด** → `scrollHeight` คงที่ → ไม่มี feedback loop). ซ่อน **FAB** อย่างเดียวด้วย CSS (`opacity:0` + `pointer-events:none` หรือ `display:none`) ผูกกับ class `[class.is-hidden]="atBottom"` — ไม่ใช่ `*ngIf` (ไม่แตะ DOM height). inline ปุ่มมองเห็นตลอดล่างสุดตามที่ user ขอ ("ไม่ต้องซ่อนปุ่มบันทึกด้านล่าง").
2. **Icon** — เปลี่ยน `checkmark-outline` → `save-outline` ทั้ง inline (L280) + FAB (L297).
3. **Success toast** — inject `ToastController`; หลัง `addEntry` สำเร็จ (หลัง reset, L260) แสดง toast "บันทึกสำเร็จ" (duration ~1500ms, position bottom/top, color success/DS token). errorpath เดิมคงไว้.

## Affected Files
- `src/app/add/add.page.html` — `.submit-section` เอา `*ngIf` ออก; FAB เปลี่ยน `*ngIf="!atBottom"` → `[class.is-hidden]="atBottom"` (คง `slot="fixed"`); icon `checkmark-outline`→`save-outline` (2 ที่)
- `src/app/add/add.page.scss` — `.save-fab.is-hidden { opacity:0; pointer-events:none; transition เคารพ prefers-reduced-motion }` (หรือ display:none)
- `src/app/add/add.page.ts` — inject `ToastController`; `save()` success → `presentToast('บันทึกสำเร็จ')`
- `src/app/add/add.page.spec.ts` — ปรับ TC-03 (เดิม assert inline `*ngIf` add/remove) → assert FAB class toggle + inline always-present; เพิ่ม test icon + toast

## Test Cases (พิสูจน์ red→green)
- [x] TC-01: component — inline `.submit-section` อยู่ใน DOM ทั้งตอน `atBottom=true` และ `false` (ไม่ถูก `*ngIf` remove) — FAIL ก่อน fix (ตอนนี้ removed เมื่อ !atBottom) ✅ GREEN
- [x] TC-02: component — FAB มี class `is-hidden` เมื่อ `atBottom=true`, ไม่มีเมื่อ `false` (แทน `*ngIf` DOM toggle) ✅ GREEN
- [x] TC-03: component — ปุ่มบันทึก (inline + FAB) render `ion-icon[name="save-outline"]` — FAIL ก่อน fix (`checkmark-outline`) ✅ GREEN
- [x] TC-04: component — `save()` valid form สำเร็จ → `ToastController.create/present` ถูกเรียกด้วยข้อความ "บันทึกสำเร็จ" — FAIL ก่อน fix (ไม่มี toast) ✅ GREEN (+ TC-04b: invalid form → ไม่เรียก toast)
- [x] TC-05: (regression) component — plan-เดิม TC-01..04 (trip→vehicle autofill, manual vehicle preserved, atBottom boundary calc, save invalid/valid path) ยังผ่านทั้งหมด ✅ 85/85 SUCCESS

## Risk
- **display:none บน FAB** อาจตัด transition/animation — mitigation: ใช้ `opacity:0 + pointer-events:none` (คง transition) หรือ `visibility:hidden`; เคารพ `prefers-reduced-motion`
- **inline ปุ่มอยู่ตลอด** → ตอน scroll กลางฟอร์มจะเห็นทั้ง FAB (ลอย) + inline (ยังไม่ scroll ถึง) — ยอมรับได้ (inline อยู่ล่างสุด, FAB ลอยมุมขวาล่าง; user ขอแบบนี้). ตรวจ manual ว่าไม่ทับกันน่าเกลียด
- **Toast ซ้อน**ตอนกดบันทึกรัวๆ — mitigation: `isSaving` guard มีอยู่แล้ว กัน double-submit

## Next
- [x] แก้ผ่าน `/ow-implement --from-fix` (option B, P3/P2 polish — ข้าม plan; fix-log = หน่วยงาน) — mobile subagent
- [x] After-evidence + red→green captured: `test-artifacts/2026-07-06/fix-202607061033-add-fab-scroll-flicker-icon-toast/{lint-output.txt,test-output.txt,EVIDENCE.md}`
- [x] ปิด fix-log: `status: fixed` (fixed_commit: pending — sha เติมโดย `/ow-git`)
- [ ] On-device manual UAT (scroll-feel ราบรื่นจริง + toast แสดง) — รัน `/ow-test`
- [ ] Commit/push — `/ow-git`
