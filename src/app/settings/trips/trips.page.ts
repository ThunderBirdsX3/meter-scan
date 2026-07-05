import { Component, OnInit } from '@angular/core';
import { FuelDataService } from '../../services/fuel-data.service';
import { Trip, Vehicle } from '../../models/fuel-entry.model';

@Component({
  selector: 'app-trips',
  templateUrl: 'trips.page.html',
  styleUrls: ['trips.page.scss'],
  standalone: false,
})
export class TripsPage implements OnInit {

  trips: Trip[] = [];
  vehicles: Vehicle[] = [];

  // ── Trip modal ────────────────────────────────────────────────────────────
  tripModalOpen = false;
  tripModalMode: 'add' | 'edit' = 'add';
  tripDraft: Partial<Trip> = {};
  private tripEditId: number | null = null;
  tripIsSaving = false;

  // ── Delete alert ──────────────────────────────────────────────────────────
  deleteTripAlertOpen = false;
  private deleteTripId: number | null = null;
  deleteTripButtons = [
    { text: 'ยกเลิก', role: 'cancel' },
    { text: 'ลบ', role: 'destructive', handler: () => this.doDeleteTrip() },
  ];

  constructor(private data: FuelDataService) {}

  async ngOnInit() {
    await this.reload();
  }

  private async reload() {
    const [trips, vehicles] = await Promise.all([
      this.data.getTrips(),
      this.data.getVehicles(),
    ]);
    this.trips = trips;
    this.vehicles = vehicles;
  }

  // ── Trip CRUD ─────────────────────────────────────────────────────────────

  openTripModal(trip?: Trip) {
    this.tripModalMode = trip ? 'edit' : 'add';
    this.tripDraft = trip
      ? { name: trip.name, vehicleId: trip.vehicleId, startOdometer: trip.startOdometer }
      : {};
    this.tripEditId = trip?.id ?? null;
    this.tripModalOpen = true;
  }

  cancelTripModal() {
    this.tripModalOpen = false;
  }

  onTripModalDismiss() {
    this.tripModalOpen = false;
    this.tripDraft = {};
    this.tripEditId = null;
  }

  async saveTrip() {
    if (!this.tripDraft.name) return;
    this.tripIsSaving = true;
    try {
      if (this.tripModalMode === 'add') {
        await this.data.addTrip({
          name: this.tripDraft.name,
          vehicleId: this.tripDraft.vehicleId || undefined,
          startOdometer: this.tripDraft.startOdometer,
          // New trips are enabled by default — isActive now means "shown in the add-page
          // trip picker" (plan 2026-07-05-1935-trip-enable-disable), not active-trip lifecycle.
          isActive: true,
        });
      } else if (this.tripEditId) {
        await this.data.updateTrip(this.tripEditId, this.tripDraft);
      }
      this.tripModalOpen = false;
      await this.reload();
    } finally {
      this.tripIsSaving = false;
    }
  }

  /** Toggle enable/disable of a trip for the add-page picker — persists immediately. */
  async onToggle(t: Trip, ev: CustomEvent) {
    const checked = !!ev.detail.checked;
    await this.data.updateTrip(t.id, { isActive: checked });
    t.isActive = checked;
  }

  confirmDeleteTrip(trip: Trip) {
    this.deleteTripId = trip.id;
    this.deleteTripAlertOpen = true;
  }

  private async doDeleteTrip() {
    if (!this.deleteTripId) return;
    await this.data.deleteTrip(this.deleteTripId);
    this.deleteTripId = null;
    await this.reload();
  }
}
