import { Injectable } from '@angular/core';
import { createWorker, PSM, Worker } from 'tesseract.js';

@Injectable({ providedIn: 'root' })
export class OcrService {
  private worker: Worker | null = null;
  private initPromise: Promise<void> | null = null;
  onProgress?: (status: string) => void;

  private async ensureWorker(): Promise<void> {
    if (this.worker) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.worker = await createWorker('eng', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (this.onProgress && m.status) {
            const pct = Math.round((m.progress || 0) * 100);
            this.onProgress(`${m.status} ${pct > 0 ? pct + '%' : ''}`.trim());
          }
        },
      });
      await this.worker.setParameters({
        // Restrict recognition to digits and decimal point only
        tessedit_char_whitelist: '0123456789.',
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
      });
    })();

    return this.initPromise;
  }

  /**
   * Preprocess image on canvas: grayscale + contrast boost.
   * Improves OCR accuracy on LCD/mechanical meter displays.
   */
  preprocessImage(dataUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(dataUrl); return; }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imageData.data;

        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          // Contrast factor 1.8
          const c = Math.min(255, Math.max(0, ((gray - 128) * 1.8) + 128));
          d[i] = d[i + 1] = d[i + 2] = c;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = dataUrl;
    });
  }

  async recognize(dataUrl: string): Promise<{ text: string; rawText: string; confidence: number }> {
    await this.ensureWorker();
    const { data } = await this.worker!.recognize(dataUrl);
    const rawText = data.text;
    const text = rawText.trim().replace(/[^0-9.]/g, '');
    // DEBUG: surface raw Tesseract output to diagnose empty-result cause
    console.log('[OCR] raw:', JSON.stringify(rawText), 'conf:', data.confidence);
    return { text, rawText, confidence: Math.round(data.confidence) };
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.initPromise = null;
    }
  }
}
