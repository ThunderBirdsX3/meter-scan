# Meter Scan

Mobile app — photograph a fuel dispenser meter and read the number **on-device, offline**, using a custom 7-segment OCR model (CRNN) run via onnxruntime-web.

> The model training pipeline lives in a separate repo: **[`local-llm/`](local-llm/)** (git submodule). This README documents the **app**; see [`local-llm/README.md`](local-llm/README.md) for the ML side.

## Stack

| Layer | Tech |
|-------|------|
| UI | Ionic 8 + Angular 20 (`@angular/*` 20.3.x), **NgModule** pattern (`standalone: false`) |
| Native | Capacitor 8 — iOS + Android |
| Camera | `@capacitor/camera` (+ `@ionic/pwa-elements` for web) |
| OCR | Custom **CRNN** (`crnn.onnx`, 5.3 MB) via **onnxruntime-web** (WASM, offline) |

Bundle ID: `com.supasin.meterscan` (no hyphen — Android rejects hyphens in applicationId/namespace).

## How it works

```
photo (camera/gallery)
   └─► user drags a box over the number (manual ROI on a canvas)
        └─► preprocess: grayscale → resize 128×32 → invert → percentile stretch → gamma 2.4
             └─► CRNN (onnxruntime-web, WASM)  →  logits [1,T,12]
                  └─► CTC greedy decode  →  "1000.0"
```

Why a custom model: Tesseract.js / ML Kit are trained on document/print fonts and fail on
7-segment LCD dispenser displays. The CRNN is trained specifically on this display family
(synthetic 7-seg data + real photos). See `local-llm/`.

Localization is **manual** (the user drags the ROI). Auto-detecting the LCD with classical
CV was unreliable; it's deferred until more real data is collected.

## Project structure

```
src/app/
  home/                       scan page (camera → crop → read → history)
  services/
    camera.service.ts         Capacitor Camera wrapper (camera + gallery)
    meter-onnx.service.ts     CRNN ONNX reader (onnxruntime-web)
    ocr.service.ts            legacy Tesseract worker (unused, kept for reference)
src/assets/
  models/crnn.onnx            trained model (copied from local-llm/export/)
  ort/                        onnxruntime-web WASM runtime
local-llm/                    ML training pipeline (git submodule)
```

### `meter-onnx.service.ts` contract

- `readField(source, roi?)` → digit string (`""` if nothing read).
- Model IO: input `image` f32 `[1,1,32,128]` NCHW (normalized 0–1); output `logits` f32 `[1,T,12]`.
- Charset `0123456789.`, index `0` = CTC blank.
- **Preprocess must stay byte-identical to** `local-llm/src/utils.py:preprocess_field`
  (grayscale → resize 128×32 → invert → percentile(5,99) stretch → gamma 2.4). Drift here
  silently wrecks accuracy.

## Build / run

```bash
npm install
npm run build          # Angular build → www/
npx cap sync           # web → native (run from project ROOT)

ionic cap build ios    # opens Xcode
npx cap open android   # opens Android Studio
```

### Native gotchas

- **Permissions**: iOS `NSCameraUsageDescription` + photo keys in `Info.plist`;
  Android `CAMERA` + `READ_MEDIA_IMAGES` in `AndroidManifest.xml`.
- **Canvas taint**: the photo is passed through `Capacitor.convertFileSrc(uri)` before drawing
  to a canvas, so `getImageData` works on native (file:// would taint it).
- **onnxruntime-web**: `ort.env.wasm.numThreads = 1` (the webview is not cross-origin-isolated,
  so no SharedArrayBuffer) and `ort.env.wasm.wasmPaths = 'assets/ort/'`.
- Changing the bundle ID → also move/rename `MainActivity.java` package dir + `package` decl to
  match the Android namespace, else runtime crash.

## Updating the model

After retraining in `local-llm/` (see [`local-llm/docs/ADDING_DATA.md`](local-llm/docs/ADDING_DATA.md)):

```bash
cp local-llm/export/crnn.onnx src/assets/models/crnn.onnx
npm run build && npx cap sync
```

## Status

POC. The shipped model reads the dispenser(s) we have photos of; the training set currently
overlaps the test set (see `local-llm/README.md`), so it is **not** a clean generalization
score. Collect ~100–200 more real photos of each meter type to harden it.
