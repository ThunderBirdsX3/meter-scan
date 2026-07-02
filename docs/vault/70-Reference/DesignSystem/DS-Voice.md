---
title: DS-Voice
status: active
last_updated: 2026-06-30
---

# Voice & Microcopy — Meter Scan

## Tone

Plain, calm, action-first. Field-tech context (user at a fuel pump, one-handed, outdoors).
Short imperative verbs. No jargon ("OCR", "ROI", "CRNN" never shown to user). Reassure on privacy
(offline) since it's a differentiator.

| Trait | Do | Don't |
|---|---|---|
| Brevity | "Scan Meter" | "Initiate meter scanning process" |
| Clarity | "Drag a box over the number" | "Define region of interest" |
| Honesty | "Couldn't read the number" | "Error 0x04" |
| Privacy | "On-device AI — no internet required" | (omit) |

## Copy inventory (current + recommended)

| Surface | Current | Recommended | Notes |
|---|---|---|---|
| App title | "Fuel Meter Scanner" | keep | |
| Empty heading | "Fuel Meter Scanner" | keep | |
| Empty body | "Point camera at the fuel dispenser meter and tap Scan" | keep | |
| Empty note | "On-device AI — no internet required" | keep | privacy win |
| Primary CTA | "Scan Meter" | keep | |
| Gallery CTA | "Gallery" | keep | |
| Auto status | "Detecting meter fields…" | keep | ellipsis = in-progress |
| Manual hint | "Drag a box over the number, then tap Read" | keep | |
| Read button | "Read selected" | keep | |
| Re-scan | "Re-scan" | keep | |
| Manual | "Select manually" | keep | |
| History header | "Scan History" | keep | |
| No reading | "—" | add SR label "no reading" | accessibility (V6) |

## State message patterns

- **Empty:** what + how. ("Point camera… and tap Scan")
- **In-progress:** present continuous + ellipsis. ("Detecting meter fields…")
- **Success:** show the number; no celebratory copy needed (the readout IS feedback).
- **Error:** plain cause + recovery. e.g. "Couldn't read the number. Try Re-scan or Select manually."
- **No-reading field:** "—" visually + "no reading" for screen readers.

## Error copy guidance

| Situation | Recommended message |
|---|---|
| Camera permission denied | "Camera access needed. Enable it in Settings to scan." |
| Read failed | "Couldn't read the number. Re-scan or select the digits manually." |
| Image load failed | "Couldn't open that photo. Try another." |

> Keep errors blame-free and recovery-oriented. Always pair with an icon + `role="alert"` (DS-A11y V5).
