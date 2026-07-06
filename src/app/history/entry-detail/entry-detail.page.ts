import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FuelDataService } from '../../services/fuel-data.service';
import { FuelEntry } from '../../models/fuel-entry.model';

@Component({
  selector: 'app-entry-detail',
  templateUrl: 'entry-detail.page.html',
  styleUrls: ['entry-detail.page.scss'],
  standalone: false,
})
export class EntryDetailPage implements OnInit {
  entry: FuelEntry | null = null;
  imageError = false;

  vehicleName = '';
  tripName = '';
  brandName = '';
  fuelTypeName = '';

  deleteAlertOpen = false;
  alertButtons = [
    { text: 'ยกเลิก', role: 'cancel' },
    { text: 'ลบ', role: 'destructive', handler: () => this.doDelete() },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private data: FuelDataService,
  ) {}

  async ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : NaN;
    if (!Number.isFinite(id)) return;
    this.entry = await this.data.getEntry(id);
    if (!this.entry) return;

    const [vehicles, trips] = await Promise.all([
      this.data.getVehicles(),
      this.data.getTrips(),
    ]);

    // Brand/fuel type use UNFILTERED lookups (getBrandById/getFuelTypeById) so a soft-hidden
    // row (SRS FR-005 §Config lifecycle) still resolves its name here — history/detail must
    // keep showing the correct name even after the row is hidden from pickers.
    const [brand, fuelType] = await Promise.all([
      this.entry.brandId != null ? this.data.getBrandById(this.entry.brandId) : Promise.resolve(null),
      this.entry.fuelTypeId != null ? this.data.getFuelTypeById(this.entry.fuelTypeId) : Promise.resolve(null),
    ]);

    this.vehicleName = vehicles.find(v => v.id === this.entry!.vehicleId)?.name ?? '';
    this.tripName = trips.find(t => t.id === this.entry!.tripId)?.name ?? '';
    this.brandName = brand?.name ?? '';
    this.fuelTypeName = fuelType?.label ?? '';
  }

  openEdit() {
    // Navigate back to history with edit intent — no separate edit route yet
    this.router.navigate(['/history'], { queryParams: { editId: this.entry?.id } });
  }

  confirmDelete() {
    this.deleteAlertOpen = true;
  }

  private async doDelete() {
    if (!this.entry) return;
    await this.data.deleteEntry(this.entry.id);
    this.router.navigate(['/history']);
  }
}
