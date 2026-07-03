import { Component, OnInit } from '@angular/core';
import { ThemeService } from './services/theme.service';
import { DbService } from './services/db.service';
import { SeedService } from './services/seed.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {

  // DB bootstrap state (FR-010/011) — router-outlet is gated on `dbReady` so no page tries to
  // query FuelDataService before the schema + seed are in place. On failure, shows a DB_INIT
  // error state with retry (SRS §7 Error Catalog) instead of a blank/broken screen.
  dbReady = false;
  dbError: string | null = null;
  isRetrying = false;

  constructor(
    private theme: ThemeService,
    private db: DbService,
    private seed: SeedService,
  ) {}

  ngOnInit() {
    // Apply persisted theme pref as early as possible to minimize flash (Risk: theme flash on startup)
    void this.theme.init();
    void this.bootstrapDb();
  }

  async retryDbInit(): Promise<void> {
    this.isRetrying = true;
    await this.bootstrapDb();
  }

  private async bootstrapDb(): Promise<void> {
    this.dbError = null;
    try {
      await this.db.init();
      await this.seed.seedIfNeeded();
      this.dbReady = true;
    } catch {
      this.dbReady = false;
      this.dbError = 'เปิดฐานข้อมูลไม่สำเร็จ';
    } finally {
      this.isRetrying = false;
    }
  }
}
