import { Injectable } from '@angular/core';
import * as ort from 'onnxruntime-web';

/**
 * On-device 7-segment meter reader using the custom CRNN (trained in local-llm/).
 * Runs the ONNX model via onnxruntime-web (WASM) — fully offline in the webview.
 *
 * Model IO (see local-llm/src/export.py):
 *   input  "image"  float32 [1,1,32,W]  (W=128, NCHW, normalized [0,1])
 *   output "logits" float32 [1,T,12]    (12 = blank + "0123456789.")
 *
 * Preprocess MUST match local-llm/src/utils.py:preprocess_field exactly:
 *   grayscale -> resize 128x32 -> invert -> percentile(5,99) stretch -> gamma 2.4
 */
@Injectable({ providedIn: 'root' })
export class MeterOnnxService {
  private session: ort.InferenceSession | null = null;
  private initPromise: Promise<void> | null = null;

  // charset order: logits index 0 = CTC blank, 1..N = CHARS
  private static readonly CHARS = '0123456789.';
  private static readonly IMG_W = 128;
  private static readonly IMG_H = 32;
  private static readonly GAMMA = 2.4;

  /** Optional: preload the model so the first scan is instant. */
  warmUp(): void {
    this.ensureSession().catch(() => { /* surfaced on first real use */ });
  }

  private async ensureSession(): Promise<void> {
    if (this.session) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      // single-threaded WASM: Capacitor webview is not cross-origin-isolated
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.wasmPaths = 'assets/ort/';
      this.session = await ort.InferenceSession.create('assets/models/crnn.onnx', {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });
    })();
    return this.initPromise;
  }

  /**
   * Read one LCD number field.
   * @param source full image element (or canvas) to crop from
   * @param roi    crop rectangle in source pixels {x,y,w,h}; omit = whole source
   */
  async readField(
    source: CanvasImageSource & { width: number; height: number },
    roi?: { x: number; y: number; w: number; h: number },
  ): Promise<string> {
    await this.ensureSession();
    const input = this.preprocess(source, roi);
    const tensor = new ort.Tensor('float32', input, [
      1, 1, MeterOnnxService.IMG_H, MeterOnnxService.IMG_W,
    ]);
    const out = await this.session!.run({ image: tensor });
    const logits = out['logits'];
    return this.ctcGreedyDecode(
      logits.data as Float32Array,
      logits.dims[1],            // T
      logits.dims[2],            // num classes (12)
    );
  }

  /** Port of preprocess_field: returns Float32Array length H*W, row-major. */
  private preprocess(
    source: CanvasImageSource & { width: number; height: number },
    roi?: { x: number; y: number; w: number; h: number },
  ): Float32Array {
    const W = MeterOnnxService.IMG_W;
    const H = MeterOnnxService.IMG_H;
    const sx = roi ? roi.x : 0;
    const sy = roi ? roi.y : 0;
    const sw = roi ? roi.w : source.width;
    const sh = roi ? roi.h : source.height;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, W, H);
    const px = ctx.getImageData(0, 0, W, H).data;

    // grayscale + invert (digits -> bright)
    const x = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
      const gray = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      x[i] = 1 - gray;
    }

    // robust per-image stretch using 5th/99th percentile
    const lo = this.percentile(x, 5);
    const hi = this.percentile(x, 99);
    const denom = Math.max(hi - lo, 1e-3);
    for (let i = 0; i < x.length; i++) {
      let v = (x[i] - lo) / denom;
      v = v < 0 ? 0 : v > 1 ? 1 : v;
      x[i] = Math.pow(v, MeterOnnxService.GAMMA);   // suppress mid-tone ghost
    }
    return x;
  }

  private percentile(arr: Float32Array, p: number): number {
    const sorted = Float32Array.from(arr).sort();
    const idx = Math.min(sorted.length - 1,
      Math.max(0, Math.floor((p / 100) * (sorted.length - 1))));
    return sorted[idx];
  }

  /** logits flat [T*C] -> string. Collapse repeats, drop blank (index 0). */
  private ctcGreedyDecode(data: Float32Array, T: number, C: number): string {
    const out: string[] = [];
    let prev = -1;
    for (let t = 0; t < T; t++) {
      let best = 0, bestVal = -Infinity;
      for (let c = 0; c < C; c++) {
        const v = data[t * C + c];
        if (v > bestVal) { bestVal = v; best = c; }
      }
      if (best !== prev && best !== 0) out.push(MeterOnnxService.CHARS[best - 1]);
      prev = best;
    }
    return out.join('');
  }
}
