import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { BaseModalComponent } from '../base-modal/base-modal.component';

export type NoteCreationType = 'music' | 'standard';

export interface CreateNotePayload {
  type: NoteCreationType;
  title: string;
  author?: string;
}

@Component({
  selector: 'app-create-note-modal',
  templateUrl: './create-note-modal.component.html',
  styleUrls: ['./create-note-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, BaseModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateNoteModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly created = new EventEmitter<CreateNotePayload>();

  @ViewChild('titleInput') titleInputRef?: ElementRef<HTMLInputElement>;

  selectedType: NoteCreationType = 'music';
  title = '';
  author = '';

  private pendingPayload: CreateNotePayload | null = null;
  private dismissTimeout?: ReturnType<typeof setTimeout>;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.resetForm();
      setTimeout(() => {
        this.titleInputRef?.nativeElement?.focus();
      }, 250);
    }
  }

  setType(type: NoteCreationType): void {
    this.selectedType = type;
  }

  get isFormValid(): boolean {
    return this.title.trim().length > 0;
  }

  resetForm(): void {
    this.selectedType = 'music';
    this.title = '';
    this.author = '';
  }

  handleClose(): void {
    this.pendingPayload = null;
    clearTimeout(this.dismissTimeout);
    this.resetForm();
    this.closed.emit();
  }

  handleSubmit(): void {
    if (!this.isFormValid) return;

    this.pendingPayload = {
      type: this.selectedType,
      title: this.title.trim(),
      author: this.selectedType === 'music' && this.author.trim() ? this.author.trim() : undefined
    };

    // 1. Cerrar primero el modal para que desaparezca completamente de la pantalla
    this.closed.emit();

    // 2. Fallback de seguridad por si el evento didDismiss de Ionic se retrasa
    clearTimeout(this.dismissTimeout);
    this.dismissTimeout = setTimeout(() => {
      if (this.pendingPayload) {
        this.handleDidDismiss();
      }
    }, 320);
  }

  handleDidDismiss(): void {
    clearTimeout(this.dismissTimeout);
    const payload = this.pendingPayload;
    this.pendingPayload = null;
    this.resetForm();
    if (payload) {
      // 3. Emitir created SOLO cuando el modal ya se haya cerrado al 100%
      this.created.emit(payload);
    }
  }
}

