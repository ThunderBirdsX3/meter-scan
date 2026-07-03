import { Component, OnInit } from '@angular/core';
import { FuelDataService } from '../../services/fuel-data.service';
import { FuelType, Vehicle } from '../../models/fuel-entry.model';

@Component({
  selector: 'app-vehicles',
  templateUrl: 'vehicles.page.html',
  styleUrls: ['vehicles.page.scss'],
  standalone: false,
})
export class VehiclesPage implements OnInit {

  vehicles: Vehicle[] = [];
  fuelTypes: FuelType[] = [];

  // ── Vehicle modal ─────────────────────────────────────────────────────────
  vehicleModalOpen = false;
  vehicleModalMode: 'add' | 'edit' = 'add';
  vehicleDraft: Partial<Vehicle> = {};
  private vehicleEditId: number | null = null;
  vehicleIsSaving = false;

  // ── Delete alert ──────────────────────────────────────────────────────────
  deleteVehicleAlertOpen = false;
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
    this.fuelTypes = fuelTypes;
  }

  // ── Vehicle CRUD ──────────────────────────────────────────────────────────

  openVehicleModal(vehicle?: Vehicle) {
    this.vehicleModalMode = vehicle ? 'edit' : 'add';
    this.vehicleDraft = vehicle
      ? { name: vehicle.name, licensePlate: vehicle.licensePlate, fuelTypeId: vehicle.fuelTypeId }
      : {};
    this.vehicleEditId = vehicle?.id ?? null;
    this.vehicleModalOpen = true;
  }

  cancelVehicleModal() {
    this.vehicleModalOpen = false;
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

  confirmDeleteVehicle(vehicle: Vehicle) {
    this.deleteVehicleId = vehicle.id;
    this.deleteVehicleAlertOpen = true;
  }

  private async doDeleteVehicle() {
    if (!this.deleteVehicleId) return;
    await this.data.deleteVehicle(this.deleteVehicleId);
    this.deleteVehicleId = null;
    await this.reload();
  }
}
