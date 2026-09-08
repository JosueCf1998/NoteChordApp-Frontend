import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-swipe-actions',
  templateUrl: './swipe-actions.component.html',
  styleUrls: ['./swipe-actions.component.scss'],
  standalone: false
})
export class SwipeActionsComponent {
  @Output() edit = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();
}
