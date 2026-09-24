import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewEncapsulation
} from '@angular/core';
import { IonicModule } from '@ionic/angular';

export type ActionMenuRole = 'default' | 'danger' | 'primary';

export interface ActionMenuItem {
  id?: string;
  label: string;
  icon?: string;
  role?: ActionMenuRole;
  disabled?: boolean;
  separator?: boolean;
  handler?: () => void;
}

@Component({
  selector: 'app-action-menu',
  templateUrl: './action-menu.component.html',
  styleUrls: ['./action-menu.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ActionMenuComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() trigger?: string;
  @Input() triggerAction: 'click' | 'hover' | 'context-menu' = 'click';
  @Input() side: 'top' | 'bottom' | 'start' | 'end' = 'bottom';
  @Input() alignment: 'start' | 'center' | 'end' = 'end';
  @Input() items: ActionMenuItem[] = [];
  @Input() headerText?: string;
  @Input() showBackdrop = true;
  @Input() dismissOnSelect = true;
  @Input() arrow = false;
  @Input() minWidth = '184px';
  @Input() maxWidth = '280px';
  @Input() customClass = '';

  @Output() readonly itemSelect = new EventEmitter<ActionMenuItem>();
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly isOpenChange = new EventEmitter<boolean>();

  private closeEmitted = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.closeEmitted = false;
    }
  }

  get popoverCssClass(): string {
    return `action-menu-popover ${this.customClass}`.trim();
  }

  onItemClick(item: ActionMenuItem): void {
    if (item.disabled) return;

    if (item.handler) {
      item.handler();
    }

    this.itemSelect.emit(item);

    if (this.dismissOnSelect) {
      this.requestClose();
    }
  }

  onDidDismiss(): void {
    this.requestClose();
  }

  requestClose(): void {
    if (this.closeEmitted) return;
    this.closeEmitted = true;
    this.isOpen = false;
    this.isOpenChange.emit(false);
    this.closed.emit();
  }
}
