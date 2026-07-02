---
title: REF-TechStack
type: reference
project: meter-scan
updated: 2026-06-28
---

# Tech Stack — Meter Scan

## Mobile App

| Layer | Technology | Version/Note |
|-------|-----------|--------------|
| Framework | Ionic | 8 |
| UI Framework | Angular | 20 (`@angular/*` 20.3.x) |
| Component style | NgModule (standalone: false) | Module-based, NOT standalone |
| Native bridge | Capacitor | 8 |
| Platforms | iOS + Android | Bundle ID: `com.supasin.meterscan` |

## OCR Engine

| Component | Detail |
|-----------|--------|
| Engine | Custom CRNN (ONNX) — on-device, fully offline |
| Runtime | onnxruntime-web (WASM) |
| Model file | `src/assets/models/crnn.onnx` (5.3 MB) |
| Model I/O | Input: `image` f32 [1,1,32,128] NCHW · Output: `logits` f32 [1,T,12] |
| Charset | `0123456789.` — index 0 = CTC blank |
| Preprocess | grayscale → resize 128×32 → invert → percentile(5,99) stretch → gamma 2.4 |
| Legacy | Tesseract.js (kept as dep, unused — weak on 7-segment LCD) |

## WASM Configuration

| Setting | Value |
|---------|-------|
| `ort.env.wasm.wasmPaths` | `assets/ort/` |
| `numThreads` | 1 (webview not cross-origin-isolated) |
| WASM files | `src/assets/ort/ort-wasm-simd-threaded.{wasm,mjs}` |

## Services (`src/app/services/`)

| Service | Role |
|---------|------|
| `camera.service.ts` | Capacitor Camera wrapper (camera + gallery) |
| `meter-onnx.service.ts` | CRNN ONNX reader — `readField(img, roi)` → digit string |
| `ocr.service.ts` | Legacy Tesseract worker (unused, reference only) |

## Training Pipeline (submodule)

| Component | Detail |
|-----------|--------|
| Submodule | `local-llm/` → `git@github.com:ThunderBirdsX3/meter-scan-llm.git` |
| Preprocess ref | `local-llm/src/utils.py:preprocess_field` |
| Export path | `local-llm/export/crnn.onnx` → copy to `src/assets/models/crnn.onnx` |
| Add data guide | `local-llm/docs/ADDING_DATA.md` |

## Build Commands

| Command | Purpose |
|---------|---------|
| `npm run build` | Angular build → `www/` |
| `npx cap sync` | Sync web → native (run from project root) |
| `ionic cap build ios` | Open Xcode for device deploy |

## Native Permissions

| Platform | Permissions |
|----------|------------|
| iOS | `NSCameraUsageDescription` + photo keys in Info.plist |
| Android | `CAMERA` + `READ_MEDIA_IMAGES` in AndroidManifest.xml |

## Notes

- `Capacitor.convertFileSrc(uri)` required before drawing photo to canvas (keeps canvas untainted for `getImageData`)
- ROI localization = manual drag by user (auto CV detection deferred — insufficient real data)
- Changing bundle ID → must rename `MainActivity.java` package dir + `package` declaration
