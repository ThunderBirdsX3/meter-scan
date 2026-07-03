import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

const THEME_KEY = 'theme';
const DARK_CLASS = 'ion-palette-dark';

/**
 * ThemeService — manual 2-state (light/dark) theme switch.
 * Persists preference on-device via Capacitor Preferences (NFR-002).
 * Pairs with src/global.scss `dark.class.css` import (class-based, not OS-driven).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {

  private dark = false;

  /**
   * Load persisted pref and apply immediately. If unset (fresh install),
   * fall back to OS `prefers-color-scheme` without writing it to Preferences —
   * first `setDark` call is what actually persists a choice (FR-012).
   */
  async init(): Promise<void> {
    const { value } = await Preferences.get({ key: THEME_KEY });
    if (value === 'dark' || value === 'light') {
      this.dark = value === 'dark';
    } else {
      this.dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    }
    this.apply();
  }

  isDark(): boolean {
    return this.dark;
  }

  async setDark(value: boolean): Promise<void> {
    this.dark = value;
    this.apply();
    await Preferences.set({ key: THEME_KEY, value: value ? 'dark' : 'light' });
  }

  private apply(): void {
    document.documentElement.classList.toggle(DARK_CLASS, this.dark);
  }
}
