import { Component } from '@angular/core';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.page.html',
  styleUrls: ['settings.page.scss'],
  standalone: false,
})
export class SettingsPage {

  constructor(private theme: ThemeService) {}

  get darkMode(): boolean {
    return this.theme.isDark();
  }

  set darkMode(value: boolean) {
    void this.theme.setDark(value);
  }

  onDarkModeToggle(event: CustomEvent) {
    this.darkMode = !!event.detail.checked;
  }
}
