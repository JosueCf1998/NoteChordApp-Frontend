import { Injectable, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AlertVariant, CustomAlertComponent } from '../../shared/components/custom-alert/custom-alert.component';

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
  private readonly modalCtrl = inject(ModalController);

  async confirm(options: ConfirmOptions): Promise<boolean> {
    const modal = await this.modalCtrl.create({
      component: CustomAlertComponent,
      cssClass: 'custom-alert-modal',
      backdropDismiss: true,
      componentProps: {
        title: options.title,
        message: options.message || '',
        confirmText: options.confirmText || 'Confirmar',
        cancelText: options.cancelText || 'Cancelar',
        variant: options.variant || 'primary',
        icon: options.icon || (options.variant === 'danger' ? 'alert-circle-outline' : 'help-circle-outline'),
        isConfirm: true
      }
    });

    await modal.present();
    const { data } = await modal.onDidDismiss<boolean>();
    return Boolean(data);
  }

  async alert(options: AlertOptions): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: CustomAlertComponent,
      cssClass: 'custom-alert-modal',
      backdropDismiss: true,
      componentProps: {
        title: options.title,
        message: options.message || '',
        confirmText: options.buttonText || 'Entendido',
        variant: options.variant || 'primary',
        icon: options.icon || 'information-circle-outline',
        isConfirm: false
      }
    });

    await modal.present();
    await modal.onDidDismiss();
  }
}

