# TODO: Two-Stage OCR Pipeline

## Context

Current flow (broken): sliding window with CRNN as detector → wrong ROI → wrong reading  
Manual ROI drag → CRNN read: works correctly  
Fix: add real detector model before CRNN

## Target Pipeline

```
photo → YOLOv8-nano.onnx (detect ROIs) → CRNN.onnx × 3 (read digits) → 3 values
```

---

## Step 1: Prepare Training Data

- [ ] Convert existing 7 ROI labels (`local-llm/rois/*.json`) to YOLO format
  - boxes_norm format: `[x, y, w, h]` (already normalized 0-1, top-left origin)
  - YOLO format: `class cx cy w h` (center-xy, 0-indexed class)
  - Classes: 0=amount, 1=liters, 2=price
  - Output: `local-llm/yolo-labels/<image>.txt`
- [ ] Shoot 30-50 more photos from varied angles, distances, lighting
  - Different zoom levels
  - Slight rotations (±15°)
  - Different lighting conditions (daylight, shade, night with pump light)
- [ ] Add new images + labels to `local-llm/images/` + `local-llm/yolo-labels/`

## Step 2: Augmentation

- [ ] Write `local-llm/src/augment_yolo.py` using Albumentations
  - Transforms: brightness/contrast, perspective warp, hue-shift, blur, rotate ±15°
  - Target: 7 images × 70x augment = ~500 samples (enough for YOLOv8-nano)
  - Output: `local-llm/data/images/` + `local-llm/data/labels/`

## Step 3: Train YOLOv8-nano

- [ ] Install: `pip install ultralytics`
- [ ] Write `local-llm/data/meter.yaml`:
  ```yaml
  path: local-llm/data
  train: images
  val: images   # small dataset — use same for val, judge by visual test
  nc: 3
  names: [amount, liters, price]
  ```
- [ ] Train: `yolo detect train model=yolov8n.pt data=local-llm/data/meter.yaml epochs=100 imgsz=640`
- [ ] Export ONNX: `yolo export model=runs/detect/train/weights/best.pt format=onnx opset=17`
- [ ] Copy: `runs/detect/train/weights/best.onnx` → `src/assets/models/detector.onnx`

## Step 4: New Detection Service

- [ ] Create `src/app/services/meter-detect.service.ts`
  - Load `assets/models/detector.onnx` via onnxruntime-web
  - Input: float32 `[1, 3, 640, 640]` RGB normalized (÷255), letterboxed
  - Output: `[1, N, 8]` — decode boxes, apply NMS, map back to original image coords
  - Return: `Array<{class: 0|1|2, x, y, w, h, conf}>` in natural-image pixels
  - Ref: YOLOv8 output decoding — `local-llm/src/export.py` for format details

## Step 5: Wire Pipeline in home.page.ts

- [ ] `autoDetect()`: call `detect.getBoundingBoxes(img)` first
  - If 3 boxes found with conf > 0.5 → pass each to `onnx.readField(img, roi)` → show results
  - If detect fails (< 2 boxes or low conf) → fall back to current sliding window
- [ ] Remove/keep `autoReadAllFields()` as fallback
- [ ] Remove `scanBest()` sliding window once detector is reliable

## Step 6: Test & Tune

- [ ] Test on 5+ real pump photos not in training set
- [ ] If mAP < 0.7: collect more images or tune augmentation
- [ ] Confidence threshold: start at 0.5, tune down if missing detections
- [ ] Check inference time on device (target: < 500ms for detector + 3× CRNN)

---

## Notes

- YOLOv8-nano ONNX ≈ 6MB — acceptable for on-device
- `npx cap sync` after copying new .onnx to assets
- onnxruntime-web WASM, single-threaded (same setup as CRNN)
- YOLO letterbox padding: pad shorter side to 640, divide coords by scale to get natural px
- Existing `local-llm/rois/*.json` already has the 3-class ground truth — no re-annotation needed for existing 7 images
