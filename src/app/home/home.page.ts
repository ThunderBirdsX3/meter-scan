import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CameraService } from '../services/camera.service';
import { FieldScan, MeterOnnxService } from '../services/meter-onnx.service';

interface ScanResult {
  imageUrl: string;
  fields: FieldScan[];
  timestamp: Date;
}

type Rect = { x: number; y: number; w: number; h: number };

const FIELD_PALETTE = [
  { stroke: '#2dd36f', fill: 'rgba(45,211,111,0.18)' },
  { stroke: '#3dc2ff', fill: 'rgba(61,194,255,0.18)' },
  { stroke: '#ffc409', fill: 'rgba(255,196,9,0.18)' },
];

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  currentImage: string | null = null;
  detectedFields: FieldScan[] = [];
  autoDetecting = false;
  autoDetected = false;
  manualMode = false;
  isProcessing = false;
  processingStatus = '';
  error: string | null = null;
  history: ScanResult[] = [];
  hasSelection = false;

  readonly fieldColors = FIELD_PALETTE.map(p => p.stroke);

  private img: HTMLImageElement | null = null;
  private scale = 1;            // displayCanvasPx -> naturalPx
  private sel: Rect | null = null;
  private dragging = false;
  private start = { x: 0, y: 0 };

  constructor(
    private camera: CameraService,
    private onnx: MeterOnnxService,
  ) {}

  ngAfterViewInit() {
    this.onnx.warmUp();
  }

  async pick(fromCamera: boolean) {
    this.error = null;
    this.detectedFields = [];
    this.hasSelection = false;
    this.sel = null;
    this.autoDetected = false;
    this.manualMode = false;
    try {
      const raw = fromCamera
        ? await this.camera.takePhoto()
        : await this.camera.pickFromGallery();
      // convertFileSrc keeps the canvas same-origin (untainted) on native
      const src = Capacitor.convertFileSrc(raw);
      this.currentImage = src;
      await this.loadImage(src);
      await this.autoDetect();
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Open photo failed';
    }
  }

  async autoDetect() {
    if (!this.img) return;
    this.autoDetecting = true;
    this.detectedFields = [];
    this.autoDetected = false;
    this.error = null;
    try {
      const fields = await this.onnx.autoReadAllFields(this.img);
      if (fields) {
        this.detectedFields = fields;
        this.autoDetected = true;
        this.manualMode = false;
        this.redraw();
        this.history.unshift({
          imageUrl: this.currentImage!,
          fields,
          timestamp: new Date(),
        });
        if (this.history.length > 20) this.history.pop();
      } else {
        this.setDefaultSel();
        this.manualMode = true;
      }
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Detection failed';
      this.setDefaultSel();
      this.manualMode = true;
    } finally {
      this.autoDetecting = false;
    }
  }

  startManual() {
    this.manualMode = true;
    this.autoDetected = false;
    this.detectedFields = [];
    this.setDefaultSel();
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
      const field: FieldScan = { label: 'Manual', text: text || '—', roi };
      this.detectedFields = [field];
      this.history.unshift({
        imageUrl: this.currentImage!,
        fields: [field],
        timestamp: new Date(),
      });
      if (this.history.length > 20) this.history.pop();
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Read failed';
    } finally {
      this.isProcessing = false;
      this.processingStatus = '';
    }
  }

  private setDefaultSel() {
    const c = this.canvasRef?.nativeElement;
    if (!c) return;
    this.sel = { x: c.width * 0.15, y: c.height * 0.35, w: c.width * 0.70, h: c.height * 0.10 };
    this.hasSelection = true;
    this.redraw();
  }

  private loadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => {
        this.img = im;
        setTimeout(() => {
          this.fitCanvas();
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

    // Draw auto-detected field ROI boxes
    this.detectedFields.forEach((field, i) => {
      const pal = FIELD_PALETTE[i] ?? FIELD_PALETTE[0];
      const dx = field.roi.x / this.scale;
      const dy = field.roi.y / this.scale;
      const dw = field.roi.w / this.scale;
      const dh = field.roi.h / this.scale;
      ctx.strokeStyle = pal.stroke;
      ctx.lineWidth = 3;
      ctx.strokeRect(dx, dy, dw, dh);
      ctx.fillStyle = pal.fill;
      ctx.fillRect(dx, dy, dw, dh);
      ctx.fillStyle = pal.stroke;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(field.label, dx + 4, Math.max(12, dy - 3));
    });

    // Manual selection box
    if (this.manualMode && this.sel) {
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
    if (!this.img || !this.manualMode) return;
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

  // V3 fix: keyboard alternative for canvas ROI drag
  onCanvasKey(ev: KeyboardEvent) {
    if (!this.manualMode || !this.sel) return;
    const step = 5;
    switch (ev.key) {
      case 'ArrowLeft':  this.sel.x -= step; break;
      case 'ArrowRight': this.sel.x += step; break;
      case 'ArrowUp':    this.sel.y -= step; break;
      case 'ArrowDown':  this.sel.y += step; break;
      case '+':
      case '=':          this.sel.w += step; this.sel.h += step; break;
      case '-':          this.sel.w = Math.max(20, this.sel.w - step);
                         this.sel.h = Math.max(20, this.sel.h - step); break;
      default: return;
    }
    ev.preventDefault();
    this.hasSelection = true;
    this.redraw();
  }

  clearCurrent() {
    this.currentImage = null;
    this.detectedFields = [];
    this.error = null;
    this.img = null;
    this.sel = null;
    this.hasSelection = false;
    this.autoDetected = false;
    this.manualMode = false;
  }
}
