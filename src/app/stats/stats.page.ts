import { Component, OnInit } from '@angular/core';
import { FuelDataService } from '../services/fuel-data.service';
import { OverviewStats } from '../models/fuel-entry.model';

@Component({
  selector: 'app-stats',
  templateUrl: 'stats.page.html',
  styleUrls: ['stats.page.scss'],
  standalone: false,
})
export class StatsPage implements OnInit {
  activeSegment: 'trip' | 'month' | 'vehicle' = 'trip';
  overview: OverviewStats | null = null;

  constructor(private data: FuelDataService) {}

  async ngOnInit() {
    await this.loadOverview();
  }

  async onSegmentChange() {
    await this.loadOverview();
  }

  private async loadOverview() {
    this.overview = await this.data.getOverview(this.activeSegment);
  }
}
