import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../../core/auth/auth.service';
import { DialogService } from '../../core/dialog/dialog.service';
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
  private readonly dialogService = inject(DialogService);

  readonly user$ = this.authService.user$;

  get appearance() {
    return this.themeService.appearance;
  }

  setAppearance(mode: AppearanceMode) {
    this.themeService.setAppearance(mode);
  }

  backToFolders() {
    return this.navService.back();
  }

  async logout() {
    const confirmed = await this.dialogService.confirm({
      title: 'Cerrar sesión',
      message: 'Tus datos sincronizados permanecerán disponibles cuando vuelvas a iniciar sesión.',
      confirmText: 'Cerrar sesión',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'log-out-outline'
    });

    if (confirmed) {
      await this.performLogout();
    }
  }

  async showInformation(title: string, message: string) {
    let icon = 'information-circle-outline';
    if (title === 'Sincronización') {
      icon = 'sync-outline';
    } else if (title === 'Ayuda') {
      icon = 'help-circle-outline';
    } else if (title === 'Acerca de') {
      icon = 'cube-outline';
    }

    await this.dialogService.alert({
      title,
      message,
      buttonText: 'Entendido',
      icon
    });
  }

  private async performLogout() {
    await this.authService.logout();
    await this.navService.replace('/', undefined, true, 'back');
  }
}
