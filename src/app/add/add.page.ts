import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Capacitor } from '@capacitor/core';
import { CameraService } from '../services/camera.service';
import { MeterOnnxService } from '../services/meter-onnx.service';
import { FuelDataService } from '../services/fuel-data.service';
import { Brand, FuelEntry, FuelType, Trip, Vehicle } from '../models/fuel-entry.model';

type Rect = { x: number; y: number; w: number; h: number };
type ScanField = { label: string; text: string; roi: Rect };

const FIELD_PALETTE = [
  { stroke: '#0f766e', fill: 'rgba(15,118,110,0.18)' },   // teal-700 = color-accent-reading light
  { stroke: '#0d9488', fill: 'rgba(13,148,136,0.18)' },
  { stroke: '#047857', fill: 'rgba(4,120,87,0.18)' },
];

@Component({
  selector: 'app-add',
  templateUrl: 'add.page.html',
  styleUrls: ['add.page.scss'],
  standalone: false,
})
export class AddPage implements OnInit, AfterViewInit {
  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  // ── Form state ────────────────────────────────────────────────────────────
  draft: Partial<FuelEntry> = { datetime: new Date() };
  vehicles: Vehicle[] = [];
  trips: Trip[] = [];
  brands: Brand[] = [];
  fuelTypes: FuelType[] = [];
  error: string | null = null;
  isSaving = false;

  // ── Scan-assist state ─────────────────────────────────────────────────────
  scanOpen = false;
  scanDraftActive = false;
  scanError: string | null = null;
  currentImage: string | null = null;
  detectedFields: ScanField[] = [];
  manualMode = true;
  isProcessing = false;
  processingStatus = '';
  hasSelection = false;

  // a11y: reduced-motion check (V7 fix)
  reducedMotion = false;

  // ── Brand logo / fuel-type color preview (supplemental chip — Design Addition,
  // brand identity is NOT a DS token; see plan 2026-07-02-2140-sqlite-persistence-seed) ────────
  brandLogoError = false;

  get selectedBrand(): Brand | undefined {
    return this.brands.find(b => b.id === this.draft.brandId);
  }

  get selectedFuelType(): FuelType | undefined {
    return this.fuelTypes.find(ft => ft.id === this.draft.fuelTypeId);
  }

  private img: HTMLImageElement | null = null;
  private scale = 1;
  private sel: Rect | null = null;
  private dragging = false;
  private start = { x: 0, y: 0 };

  constructor(
    private camera: CameraService,
    private onnx: MeterOnnxService,
    private data: FuelDataService,
  ) {}

  ngOnInit() {
    // Reduced motion check (V7)
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Reset draft datetime to now on each activation
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    // datetime-local value format: YYYY-MM-DDTHH:mm
    this.draft = {
      datetime: now,
      datetimeLocal: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`,
    } as Partial<FuelEntry> & { datetimeLocal?: string };

    this.loadPickerData();
  }

  ngAfterViewInit() {
    this.onnx.warmUp();
  }

  private async loadPickerData() {
    const [vehicles, trips, brands, fuelTypes] = await Promise.all([
      this.data.getVehicles(),
      this.data.getTrips(),
      this.data.getBrands(),
      this.data.getFuelTypes(),
    ]);
    this.vehicles = vehicles;
    this.trips = trips;
    this.brands = brands;
    this.fuelTypes = fuelTypes;
  }

  // ── Form save ─────────────────────────────────────────────────────────────

  async save(form: NgForm) {
    if (form.invalid) {
      form.control.markAllAsTouched();
      this.error = 'กรุณากรอกข้อมูลที่จำเป็น';
      return;
    }

    // At least one numeric field required (FR-001)
    if (!this.draft.liters && !this.draft.pricePerLiter && !this.draft.totalAmount) {
      this.error = 'กรุณากรอกอย่างน้อย 1 ในสามฟิลด์: ลิตร / ฿/ลิตร / ฿รวม';
      return;
    }

    this.error = null;
    this.isSaving = true;
    try {
      const datetimeStr = (this.draft as any).datetimeLocal;
      const datetime = datetimeStr ? new Date(datetimeStr) : new Date();

      await this.data.addEntry({
        vehicleId: this.draft.vehicleId || undefined,
        tripId: this.draft.tripId || undefined,
        brandId: this.draft.brandId || undefined,
        fuelTypeId: this.draft.fuelTypeId || undefined,
        liters: this.draft.liters,
        pricePerLiter: this.draft.pricePerLiter,
        totalAmount: this.draft.totalAmount,
        odometer: this.draft.odometer,
        station: this.draft.station || undefined,
        note: this.draft.note || undefined,
        datetime,
        imageUri: this.currentImage ?? undefined,
      });

      // Reset form
      form.resetForm();
      const nowAfter = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      (this.draft as any) = {
        datetimeLocal: `${nowAfter.getFullYear()}-${pad(nowAfter.getMonth() + 1)}-${pad(nowAfter.getDate())}T${pad(nowAfter.getHours())}:${pad(nowAfter.getMinutes())}`,
      };
      this.scanDraftActive = false;
      this.currentImage = null;
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ';
    } finally {
      this.isSaving = false;
    }
  }

  // ── Scan-assist ───────────────────────────────────────────────────────────

  openScanAssist() {
    this.scanOpen = true;
    this.scanError = null;
    this.currentImage = null;
    this.detectedFields = [];
    this.hasSelection = false;
    this.sel = null;
    this.manualMode = true;
  }

  closeScanAssist() {
    this.scanOpen = false;
  }

  async pick(fromCamera: boolean) {
    this.scanError = null;
    this.detectedFields = [];
    this.hasSelection = false;
    this.sel = null;
    try {
      const raw = fromCamera
        ? await this.camera.takePhoto()
        : await this.camera.pickFromGallery();
      // convertFileSrc: keeps canvas untainted on native (Capacitor gotcha)
      const src = Capacitor.convertFileSrc(raw);
      this.currentImage = src;
      await this.loadImage(src);
      this.manualMode = true;
      this.setDefaultSel();
    } catch (err: unknown) {
      this.scanError = err instanceof Error ? err.message : 'เปิดภาพไม่สำเร็จ';
    }
  }

  async read() {
    if (!this.img || !this.sel) return;
    this.scanError = null;
    this.isProcessing = true;
    this.processingStatus = 'กำลังอ่านมิเตอร์…';
    try {
      const roi = {
        x: Math.round(this.sel.x * this.scale),
        y: Math.round(this.sel.y * this.scale),
        w: Math.round(this.sel.w * this.scale),
        h: Math.round(this.sel.h * this.scale),
      };
      const text = await this.onnx.readField(this.img, roi);
      this.detectedFields = [{ label: 'ยอดรวม', text: text || '—', roi }];
    } catch (err: unknown) {
      this.scanError = err instanceof Error ? err.message : 'อ่านค่าไม่สำเร็จ';
    } finally {
      this.isProcessing = false;
      this.processingStatus = '';
    }
  }

  /**
   * Apply scan result to form as editable draft (R1 mitigation: never auto-saved).
   * Maps CRNN field labels → form fields.
   */
  applyScanResult() {
    for (const f of this.detectedFields) {
      if (f.text === '—') continue;
      const val = parseFloat(f.text.replace(/[^0-9.]/g, ''));
      if (isNaN(val)) continue;
      const lbl = f.label.toLowerCase();
      if (lbl.includes('amount') || lbl.includes('ยอด')) {
        this.draft.totalAmount = val;
      } else if (lbl.includes('liter') || lbl.includes('ลิตร')) {
        this.draft.liters = val;
      } else if (lbl.includes('price') || lbl.includes('ราคา')) {
        this.draft.pricePerLiter = val;
      }
    }
    this.scanDraftActive = true;
    this.closeScanAssist();
  }

  // ── Canvas keyboard alternative (V3 fix) ─────────────────────────────────
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

  // ── Canvas internals ──────────────────────────────────────────────────────

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
      im.onerror = () => reject(new Error('โหลดภาพล้มเหลว'));
      im.src = src;
    });
  }

  private fitCanvas() {
    const c = this.canvasRef?.nativeElement;
    if (!c || !this.img) return;
    const cssW = c.clientWidth || c.parentElement?.clientWidth || 360;
    this.scale = this.img.naturalWidth / cssW;
    c.width = cssW;
    c.height = Math.round(this.img.naturalHeight / this.scale);
  }

  private redraw() {
    const c = this.canvasRef?.nativeElement;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    if (this.img) ctx.drawImage(this.img, 0, 0, c.width, c.height);

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

    if (this.manualMode && this.sel) {
      // Use DS teal token value for canvas stroke (canvas API requires literal color)
      ctx.strokeStyle = '#0f766e';  // --color-teal-700 (DS semantic: accent-reading light)
      ctx.lineWidth = 3;
      ctx.strokeRect(this.sel.x, this.sel.y, this.sel.w, this.sel.h);
      ctx.fillStyle = 'rgba(15,118,110,0.12)';
      ctx.fillRect(this.sel.x, this.sel.y, this.sel.w, this.sel.h);
    }
  }

  private pos(ev: PointerEvent) {
    const c = this.canvasRef?.nativeElement;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
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
}
