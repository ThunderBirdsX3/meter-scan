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
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.entry = await this.data.getEntry(id);
    if (!this.entry) return;

    const [vehicles, trips, brands, fuelTypes] = await Promise.all([
      this.data.getVehicles(),
      this.data.getTrips(),
      this.data.getBrands(),
      this.data.getFuelTypes(),
    ]);

    this.vehicleName = vehicles.find(v => v.id === this.entry!.vehicleId)?.name ?? '';
    this.tripName = trips.find(t => t.id === this.entry!.tripId)?.name ?? '';
    this.brandName = brands.find(b => b.id === this.entry!.brandId)?.name ?? '';
    this.fuelTypeName = fuelTypes.find(ft => ft.id === this.entry!.fuelTypeId)?.name ?? '';
  }

  openEdit() {
    // Navigate back to history with edit intent — no separate edit route yet
    this.router.navigate(['/tabs/history'], { queryParams: { editId: this.entry?.id } });
  }

  confirmDelete() {
    this.deleteAlertOpen = true;
  }

  private async doDelete() {
    if (!this.entry) return;
    await this.data.deleteEntry(this.entry.id);
    this.router.navigate(['/tabs/history']);
  }
}
