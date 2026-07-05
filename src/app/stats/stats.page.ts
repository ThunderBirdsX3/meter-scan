import { Component } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { FuelDataService } from '../services/fuel-data.service';
import { OverviewStats } from '../models/fuel-entry.model';

@Component({
  selector: 'app-stats',
  templateUrl: 'stats.page.html',
  styleUrls: ['stats.page.scss'],
  standalone: false,
})
export class StatsPage implements ViewWillEnter {
  activeSegment: 'trip' | 'month' | 'vehicle' = 'trip';
  overview: OverviewStats | null = null;

  constructor(private data: FuelDataService) {}

  // ion-tabs keeps this page instance alive across tab switches — ngOnInit fires only once, so
  // reload here instead or the overview goes stale after CRUD elsewhere.
  async ionViewWillEnter() {
    await this.loadOverview();
  }

  async onSegmentChange() {
    await this.loadOverview();
  }

  private async loadOverview() {
    this.overview = await this.data.getOverview(this.activeSegment);
  }
}
