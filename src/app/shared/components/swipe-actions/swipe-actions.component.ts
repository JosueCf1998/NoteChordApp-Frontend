import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-swipe-actions',
  templateUrl: './swipe-actions.component.html',
  styleUrls: ['./swipe-actions.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class SwipeActionsComponent {
  @Output() edit = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();
}
