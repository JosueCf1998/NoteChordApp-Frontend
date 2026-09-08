import { Component, inject } from '@angular/core';
import { AlertController } from '@ionic/angular';

import { AuthService } from '../../../../core/auth/auth.service';
import { NavigationService } from '../../../../core/navigation/navigation.service';
import { AppearanceMode, ThemeService } from '../../../../core/theme/theme.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false
})
export class SettingsPage {
  private readonly authService = inject(AuthService);
  private readonly navService = inject(NavigationService);
  private readonly themeService = inject(ThemeService);
  private readonly alertController = inject(AlertController);

  readonly user$ = this.authService.user$;

  get appearance() {
    return this.themeService.appearance;
  }

  setAppearance(mode: AppearanceMode) {
    this.themeService.setAppearance(mode);
  }

  backToFolders() {
    return this.navService.backToFolders();
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Cerrar sesión',
      message: 'Tus datos sincronizados permanecerán disponibles cuando vuelvas a iniciar sesión.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cerrar sesión',
          role: 'destructive',
          handler: () => void this.performLogout()
        }
      ]
    });
    await alert.present();
  }

  async showInformation(title: string, message: string) {
    const alert = await this.alertController.create({
      header: title,
      message,
      buttons: ['Aceptar']
    });
    await alert.present();
  }

  private async performLogout() {
    await this.authService.logout();
    await this.navService.goToLogin('back');
  }
}
