import { Injectable, inject } from '@angular/core';
import { AlertController } from '@ionic/angular';

export type AlertVariant = 'primary' | 'danger' | 'warning' | 'info';

export interface AlertOptions {
  title: string;
  message?: string;
  buttonText?: string;
  icon?: string;
  variant?: AlertVariant;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: AlertVariant;
  icon?: string;
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly alertCtrl = inject(AlertController);

  async confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header: options.title,
        message: options.message,
        buttons: [
          {
            text: options.cancelText || 'Cancelar',
            role: 'cancel',
            handler: () => resolve(false)
          },
          {
            text: options.confirmText || 'Confirmar',
            role: options.variant === 'danger' ? 'destructive' : undefined,
            handler: () => resolve(true)
          }
        ]
      });

      await alert.present();
      const result = await alert.onDidDismiss();
      if (result.role === 'cancel' || result.role === 'backdrop') {
        resolve(false);
      }
    });
  }

  async alert(options: AlertOptions): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: options.title,
      message: options.message,
      buttons: [
        {
          text: options.buttonText || 'Entendido',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
    await alert.onDidDismiss();
  }
}
