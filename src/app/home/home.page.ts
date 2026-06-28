import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CameraService } from '../services/camera.service';
import { MeterOnnxService } from '../services/meter-onnx.service';

interface ScanResult {
  imageUrl: string;
  reading: string;
  timestamp: Date;
}

type Rect = { x: number; y: number; w: number; h: number };

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  currentImage: string | null = null;
  currentReading: string | null = null;
  isProcessing = false;
  processingStatus = '';
  error: string | null = null;
  history: ScanResult[] = [];
  hasSelection = false;

  private img: HTMLImageElement | null = null;
  private scale = 1;            // displayCanvasPx -> naturalPx
  private sel: Rect | null = null;   // selection in canvas display px
  private dragging = false;
  private start = { x: 0, y: 0 };

  constructor(
    private camera: CameraService,
    private onnx: MeterOnnxService,
  ) {}

  ngAfterViewInit() {
    this.onnx.warmUp();   // preload model so first scan is fast
  }

  async pick(fromCamera: boolean) {
    this.error = null;
    this.currentReading = null;
    this.hasSelection = false;
    this.sel = null;
    try {
      const raw = fromCamera
        ? await this.camera.takePhoto()
        : await this.camera.pickFromGallery();
      // convertFileSrc keeps the canvas same-origin (untainted) on native
      const src = Capacitor.convertFileSrc(raw);
      this.currentImage = src;
      await this.loadImage(src);
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Open photo failed';
    }
  }

  private loadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => {
        this.img = im;
        // default selection: centre band (where the meter number usually sits)
        setTimeout(() => {
          this.fitCanvas();
          const c = this.canvasRef.nativeElement;
          this.sel = { x: c.width * 0.15, y: c.height * 0.4, w: c.width * 0.7, h: c.height * 0.2 };
          this.hasSelection = true;
          this.redraw();
          resolve();
        });
      };
      im.onerror = () => reject(new Error('Image load failed'));
      im.src = src;
    });
  }

  private fitCanvas() {
    const c = this.canvasRef.nativeElement;
    const im = this.img!;
    const cssW = c.clientWidth || c.parentElement!.clientWidth || 360;
    this.scale = im.naturalWidth / cssW;
    c.width = cssW;
    c.height = Math.round(im.naturalHeight / this.scale);
  }

  private redraw() {
    const c = this.canvasRef.nativeElement;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    if (this.img) ctx.drawImage(this.img, 0, 0, c.width, c.height);
    if (this.sel) {
      ctx.strokeStyle = '#2dd36f';
      ctx.lineWidth = 3;
      ctx.strokeRect(this.sel.x, this.sel.y, this.sel.w, this.sel.h);
      ctx.fillStyle = 'rgba(45,211,111,0.12)';
      ctx.fillRect(this.sel.x, this.sel.y, this.sel.w, this.sel.h);
    }
  }

  private pos(ev: PointerEvent) {
    const r = this.canvasRef.nativeElement.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }

  onDown(ev: PointerEvent) {
    if (!this.img) return;
    this.dragging = true;
    this.start = this.pos(ev);
    this.sel = { x: this.start.x, y: this.start.y, w: 0, h: 0 };
  }

  onMove(ev: PointerEvent) {
    if (!this.dragging) return;
    const p = this.pos(ev);
    this.sel = {
      x: Math.min(p.x, this.start.x),
      y: Math.min(p.y, this.start.y),
      w: Math.abs(p.x - this.start.x),
      h: Math.abs(p.y - this.start.y),
    };
    this.redraw();
  }

  onUp() {
    this.dragging = false;
    this.hasSelection = !!this.sel && this.sel.w > 8 && this.sel.h > 8;
  }

  async read() {
    if (!this.img || !this.sel) return;
    this.error = null;
    this.isProcessing = true;
    this.processingStatus = 'Reading meter…';
    try {
      const roi = {
        x: Math.round(this.sel.x * this.scale),
        y: Math.round(this.sel.y * this.scale),
        w: Math.round(this.sel.w * this.scale),
        h: Math.round(this.sel.h * this.scale),
      };
      const text = await this.onnx.readField(this.img, roi);
      this.currentReading = text || '—';
      if (text) {
        this.history.unshift({
          imageUrl: this.currentImage!,
          reading: text,
          timestamp: new Date(),
        });
        if (this.history.length > 20) this.history.pop();
      }
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Read failed';
    } finally {
      this.isProcessing = false;
      this.processingStatus = '';
    }
  }

  clearCurrent() {
    this.currentImage = null;
    this.currentReading = null;
    this.error = null;
    this.img = null;
    this.sel = null;
    this.hasSelection = false;
  }
}
