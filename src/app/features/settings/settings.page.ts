import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../../core/auth/auth.service';
import { NavigationService } from '../../core/navigation/navigation.service';
import { AppearanceMode, ThemeService } from '../../core/theme/theme.service';
import { SharedModule } from '../../shared/shared.module';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, SharedModule]
})
export class SettingsPage {
  private readonly authService = inject(AuthService);
  private readonly navService = inject(NavigationService);
  private readonly themeService = inject(ThemeService);

  readonly user$ = this.authService.user$;

  isLogoutConfirmOpen = false;
  isLoggingOut = false;

  infoModal: { title: string; message: string; icon?: string } | null = null;

  get appearance() {
    return this.themeService.appearance;
  }

  setAppearance(mode: AppearanceMode) {
    this.themeService.setAppearance(mode);
  }

  backToFolders() {
    return this.navService.back();
  }

  openLogoutConfirm() {
    this.isLogoutConfirmOpen = true;
  }

  closeLogoutConfirm() {
    this.isLogoutConfirmOpen = false;
  }

  async confirmLogout() {
    this.isLoggingOut = true;
    try {
      await this.authService.logout();
      await this.navService.replace('/', undefined, true, 'back');
    } finally {
      this.isLoggingOut = false;
      this.isLogoutConfirmOpen = false;
    }
  }

  showInformation(title: string, message: string, icon = 'information-circle-outline') {
    this.infoModal = { title, message, icon };
  }

  closeInfoModal() {
    this.infoModal = null;
  }
}
