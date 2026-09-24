import { CommonModule, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewEncapsulation
} from '@angular/core';
import { IonIcon, IonModal } from '@ionic/angular/standalone';

export type BaseModalSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-base-modal',
  templateUrl: './base-modal.component.html',
  styleUrls: ['./base-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon, IonModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class BaseModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input({ required: true }) title = '';
  @Input() description = '';
  @Input() primaryText = '';
  @Input() secondaryText = '';
  @Input() primaryDisabled = false;
  @Input() secondaryDisabled = false;
  @Input() backdropDismiss = false;
  @Input() showHeader = true;
  @Input() showClose = true;
  @Input() bodyless = false;
  @Input() bodyScrollable = true;
  @Input() reverseActions = false;
  @Input() animated = true;
  @Input() size: BaseModalSize = 'md';
  @Input() primaryRole: 'primary' | 'danger' = 'primary';

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly primary = new EventEmitter<void>();
  @Output() readonly secondary = new EventEmitter<void>();

  private closeEmitted = false;
  private triggerElement: HTMLElement | null = null;

  constructor(@Inject(DOCUMENT) private readonly document: Document) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.closeEmitted = false;
      this.releaseBackgroundFocus();
    }
  }

  get modalClass(): string {
    return `base-modal base-modal--${this.size}`;
  }

  requestClose(): void {
    if (this.closeEmitted) return;
    this.closeEmitted = true;
    this.closed.emit();
  }

  handleDidDismiss(): void {
    this.requestClose();

    const trigger = this.triggerElement;
    this.triggerElement = null;
    if (!trigger?.isConnected) return;

    requestAnimationFrame(() => trigger.focus({ preventScroll: true }));
  }

  private releaseBackgroundFocus(): void {
    const activeElement = this.document.activeElement;
    if (!(activeElement instanceof HTMLElement) || activeElement === this.document.body) return;

    this.triggerElement = activeElement;
    activeElement.blur();
  }
}

