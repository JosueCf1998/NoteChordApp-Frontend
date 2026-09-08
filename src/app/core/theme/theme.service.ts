import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppearanceMode = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'notechord-appearance';
  private readonly systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly appearanceSubject = new BehaviorSubject<AppearanceMode>(this.readPreference());

  readonly appearance$ = this.appearanceSubject.asObservable();

  constructor() {
    this.apply(this.appearanceSubject.value);
    this.systemTheme.addEventListener('change', () => {
      if (this.appearanceSubject.value === 'system') {
        this.apply('system');
      }
    });
  }

  get appearance() {
    return this.appearanceSubject.value;
  }

  setAppearance(mode: AppearanceMode) {
    localStorage.setItem(this.storageKey, mode);
    this.appearanceSubject.next(mode);
    this.apply(mode);
  }

  private readPreference(): AppearanceMode {
    const saved = localStorage.getItem(this.storageKey);
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  }

  private apply(mode: AppearanceMode) {
    const isDark = mode === 'dark' || (mode === 'system' && this.systemTheme.matches);
    document.documentElement.classList.toggle('nc-theme-dark', isDark);
    document.documentElement.classList.toggle('ion-palette-dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }
}
