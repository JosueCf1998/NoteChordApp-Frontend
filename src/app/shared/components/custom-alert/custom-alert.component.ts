import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';

export type AlertVariant = 'primary' | 'danger' | 'warning' | 'info';

@Component({
  selector: 'app-custom-alert',
  templateUrl: './custom-alert.component.html',
  styleUrls: ['./custom-alert.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
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

