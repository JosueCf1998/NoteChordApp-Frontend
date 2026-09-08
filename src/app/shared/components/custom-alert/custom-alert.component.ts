import { Component, Input, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';

export type AlertVariant = 'primary' | 'danger' | 'warning' | 'info';

@Component({
  selector: 'app-custom-alert',
  templateUrl: './custom-alert.component.html',
  styleUrls: ['./custom-alert.component.scss'],
  standalone: false
})
export class CustomAlertComponent {
  private readonly modalCtrl = inject(ModalController);

  @Input() title = '';
  @Input() message = '';
  @Input() confirmText = 'Aceptar';
  @Input() cancelText = 'Cancelar';
  @Input() variant: AlertVariant = 'primary';
  @Input() icon = 'information-circle-outline';
  @Input() isConfirm = false;

  cancel() {
    return this.modalCtrl.dismiss(false, 'cancel');
  }

  confirm() {
    return this.modalCtrl.dismiss(true, 'confirm');
  }
}

