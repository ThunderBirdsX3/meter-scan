import { Component, OnInit } from '@angular/core';
import { FuelDataService } from '../../services/fuel-data.service';
import { FuelType, Vehicle } from '../../models/fuel-entry.model';

// Vehicle type catalog (schema v3 — plan 2026-07-05-1930-vehicle-type-icons). Fixed 8-entry set,
// not DB-backed (no per-brand/user customization needed — Non-goals). `asset` is the bundled
// monochrome SVG shown via `<ion-icon [src]>` (NOT `<img>` — `<img>` does not inherit
// `currentColor`, breaking dark mode; plan Risk R2).
export const VEHICLE_TYPES: { code: string; label: string; asset: string }[] = [
  { code: 'motorcycle', label: 'จักรยานยนต์', asset: 'assets/vehicle-icons/motorcycle.svg' },
  { code: 'bigbike', label: 'บิ๊กไบค์', asset: 'assets/vehicle-icons/bigbike.svg' },
  { code: 'scooter', label: 'สกู๊ตเตอร์', asset: 'assets/vehicle-icons/scooter.svg' },
  { code: 'sedan', label: 'เก๋ง', asset: 'assets/vehicle-icons/sedan.svg' },
  { code: 'suv', label: 'SUV', asset: 'assets/vehicle-icons/suv.svg' },
  { code: 'ppv', label: 'PPV', asset: 'assets/vehicle-icons/ppv.svg' },
  { code: 'van', label: 'รถตู้', asset: 'assets/vehicle-icons/van.svg' },
  { code: 'truck', label: 'รถบรรทุก', asset: 'assets/vehicle-icons/truck.svg' },
];

@Component({
  selector: 'app-vehicles',
  templateUrl: 'vehicles.page.html',
  styleUrls: ['vehicles.page.scss'],
  standalone: false,
})
export class VehiclesPage implements OnInit {

  vehicleTypes = VEHICLE_TYPES;

  vehicles: Vehicle[] = [];
  // Vehicle default fuel now picks from the canonical catalog (brand-agnostic, schema v2) —
  // a car burns the same flag regardless of which brand's station it's filled at.
  fuelTypes: FuelType[] = [];

  // ── Vehicle modal ─────────────────────────────────────────────────────────
  vehicleModalOpen = false;
  vehicleModalMode: 'add' | 'edit' = 'add';
  vehicleDraft: Partial<Vehicle> = {};
  private vehicleEditId: number | null = null;
  vehicleIsSaving = false;

  // ── Delete alert ──────────────────────────────────────────────────────────
  deleteVehicleAlertOpen = false;
  deleteVehicleMessage = 'การดำเนินการนี้ไม่สามารถย้อนกลับได้';
  private deleteVehicleId: number | null = null;
  deleteVehicleButtons = [
    { text: 'ยกเลิก', role: 'cancel' },
    { text: 'ลบ', role: 'destructive', handler: () => this.doDeleteVehicle() },
  ];

  constructor(private data: FuelDataService) {}

  async ngOnInit() {
    await this.reload();
  }

  private async reload() {
    const [vehicles, fuelTypes] = await Promise.all([
      this.data.getVehicles(),
      this.data.getFuelTypes(),
    ]);
    this.vehicles = vehicles;
    this.fuelTypes = fuelTypes; // already sorted by sort_order (DbService.getFuelTypes query)
  }

  // ── Vehicle CRUD ──────────────────────────────────────────────────────────

  openVehicleModal(vehicle?: Vehicle) {
    this.vehicleModalMode = vehicle ? 'edit' : 'add';
    this.vehicleDraft = vehicle
      ? { name: vehicle.name, licensePlate: vehicle.licensePlate, fuelTypeId: vehicle.fuelTypeId, vehicleType: vehicle.vehicleType }
      : {};
    this.vehicleEditId = vehicle?.id ?? null;
    this.vehicleModalOpen = true;
  }

  cancelVehicleModal() {
    this.vehicleModalOpen = false;
  }

  /** Chip grid tap handler — `null` = "ไม่แสดงไอคอน" (no icon). */
  selectVehicleType(code: string | null) {
    this.vehicleDraft.vehicleType = code ?? undefined;
  }

  /** List icon source — asset path for the vehicle's chosen type, or null if none selected (no icon shown). */
  iconFor(v: Vehicle): string | null {
    return VEHICLE_TYPES.find((t) => t.code === v.vehicleType)?.asset ?? null;
  }

  onVehicleModalDismiss() {
    this.vehicleModalOpen = false;
    this.vehicleDraft = {};
    this.vehicleEditId = null;
  }

  async saveVehicle() {
    if (!this.vehicleDraft.name) return;
    this.vehicleIsSaving = true;
    try {
      if (this.vehicleModalMode === 'add') {
        await this.data.addVehicle({
          name: this.vehicleDraft.name,
          licensePlate: this.vehicleDraft.licensePlate || undefined,
          fuelTypeId: this.vehicleDraft.fuelTypeId || undefined,
          vehicleType: this.vehicleDraft.vehicleType || undefined,
        });
      } else if (this.vehicleEditId) {
        await this.data.updateVehicle(this.vehicleEditId, this.vehicleDraft);
      }
      this.vehicleModalOpen = false;
      await this.reload();
    } finally {
      this.vehicleIsSaving = false;
    }
  }

  async confirmDeleteVehicle(vehicle: Vehicle) {
    this.deleteVehicleId = vehicle.id;
    // FR-003 Post-condition: warn how many entries reference this vehicle before delete
    // (entries survive delete — ON DELETE SET NULL — plan step 8)
    const n = (await this.data.getEntries({ vehicleId: vehicle.id })).length;
    this.deleteVehicleMessage = n > 0
      ? `รถนี้มี ${n} รายการเติมผูกอยู่ — ลบแล้วรายการยังอยู่แต่จะไม่ระบุรถ`
      : 'การดำเนินการนี้ไม่สามารถย้อนกลับได้';
    this.deleteVehicleAlertOpen = true;
  }

  private async doDeleteVehicle() {
    if (!this.deleteVehicleId) return;
    await this.data.deleteVehicle(this.deleteVehicleId);
    this.deleteVehicleId = null;
    await this.reload();
  }
}
