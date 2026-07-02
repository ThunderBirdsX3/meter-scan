import { Component, OnInit } from '@angular/core';
import { FuelDataService } from '../services/fuel-data.service';
import { FuelEntry, Trip, Vehicle } from '../models/fuel-entry.model';
import { Router } from '@angular/router';

interface MonthGroup {
  month: string;
  entries: FuelEntry[];
}

@Component({
  selector: 'app-history',
  templateUrl: 'history.page.html',
  styleUrls: ['history.page.scss'],
  standalone: false,
})
export class HistoryPage implements OnInit {

  grouped: MonthGroup[] = [];
  vehicles: Vehicle[] = [];
  trips: Trip[] = [];
  isLoading = false;

  filterVehicleId = '';
  filterTripId = '';

  // Edit modal state
  editModalOpen = false;
  editDraft: Partial<FuelEntry> | null = null;
  private editTargetId: string | null = null;
  editIsSaving = false;

  // Delete alert state
  deleteAlertOpen = false;
  private deleteTargetId: string | null = null;
  deleteAlertButtons = [
    {
      text: 'ยกเลิก',
      role: 'cancel',
    },
    {
      text: 'ลบ',
      role: 'destructive',
      handler: () => this.doDelete(),
    },
  ];

  constructor(
    private data: FuelDataService,
    private router: Router,
  ) {}

  async ngOnInit() {
    const [vehicles, trips] = await Promise.all([
      this.data.getVehicles(),
      this.data.getTrips(),
    ]);
    this.vehicles = vehicles;
    this.trips = trips;
    await this.applyFilter();
  }

  async applyFilter() {
    this.isLoading = true;
    try {
      const entries = await this.data.getEntries({
        vehicleId: this.filterVehicleId || undefined,
        tripId: this.filterTripId || undefined,
      });
      this.grouped = this.groupByMonth(entries);
    } finally {
      this.isLoading = false;
    }
  }

  private groupByMonth(entries: FuelEntry[]): MonthGroup[] {
    const map = new Map<string, FuelEntry[]>();
    for (const e of entries) {
      const key = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(e.datetime);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    const result: MonthGroup[] = [];
    for (const [month, list] of map) {
      result.push({ month, entries: list });
    }
    return result;
  }

  entryAriaLabel(entry: FuelEntry): string {
    const date = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(entry.datetime);
    const parts: string[] = [date];
    if (entry.totalAmount) parts.push(`${entry.totalAmount.toFixed(2)} บาท`);
    if (entry.liters) parts.push(`${entry.liters.toFixed(1)} ลิตร`);
    if (entry.station) parts.push(entry.station);
    return parts.join(' ');
  }

  viewDetail(entry: FuelEntry) {
    this.router.navigate(['/tabs/history/detail', entry.id]);
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  editEntry(entry: FuelEntry) {
    this.editTargetId = entry.id;
    this.editDraft = {
      liters: entry.liters,
      pricePerLiter: entry.pricePerLiter,
      totalAmount: entry.totalAmount,
      odometer: entry.odometer,
      station: entry.station,
      note: entry.note,
    };
    this.editModalOpen = true;
  }

  cancelEdit() {
    this.editModalOpen = false;
  }

  onEditDismiss() {
    this.editModalOpen = false;
    this.editDraft = null;
    this.editTargetId = null;
  }

  async saveEdit() {
    if (!this.editTargetId || !this.editDraft) return;
    this.editIsSaving = true;
    try {
      await this.data.updateEntry(this.editTargetId, this.editDraft);
      this.editModalOpen = false;
      await this.applyFilter();
    } finally {
      this.editIsSaving = false;
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  confirmDelete(entry: FuelEntry) {
    this.deleteTargetId = entry.id;
    this.deleteAlertOpen = true;
  }

  private async doDelete() {
    if (!this.deleteTargetId) return;
    await this.data.deleteEntry(this.deleteTargetId);
    this.deleteTargetId = null;
    await this.applyFilter();
  }
}
