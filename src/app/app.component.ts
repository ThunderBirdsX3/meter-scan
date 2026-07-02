import { Component, OnInit } from '@angular/core';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  constructor(private theme: ThemeService) {}

  ngOnInit() {
    // Apply persisted theme pref as early as possible to minimize flash (Risk: theme flash on startup)
    void this.theme.init();
  }
}
