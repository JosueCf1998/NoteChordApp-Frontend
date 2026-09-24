import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { DialogService } from '../../core/dialog/dialog.service';
import {
  GetNoteByIdUseCase,
  CreateNoteUseCase,
  UpdateNoteUseCase,
  DeleteNoteUseCase
} from '../../core/use-cases/notes';
import { NavigationService } from '../../core/navigation/navigation.service';
import { SharedModule } from '../../shared/shared.module';

/** Umbral de scroll (px) al que se considera "arriba" y se muestra la fecha. */
const SCROLL_TOP_THRESHOLD = 8;
/** Diferencia mínima de scroll hacia abajo para ocultar la fecha. */
const SCROLL_DOWN_DELTA = 4;
/** Diferencia mínima de scroll hacia arriba (cerca del top) para mostrar la fecha. */
const SCROLL_UP_DELTA = -8;
/** Scroll máximo (px) dentro del cual el scroll rápido arriba muestra la fecha. */
const SCROLL_NEAR_TOP = 120;
/** Milisegundos de inactividad tras dejar de tocar antes de ocultar la fecha. */
const DATE_HIDE_DELAY_MS = 3000;

@Component({
  selector: 'app-note-editor',
  templateUrl: './note-editor.page.html',
  styleUrls: ['./note-editor.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, SharedModule]
})
export class NoteEditorPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly navService = inject(NavigationService);
  private readonly getNoteByIdUseCase = inject(GetNoteByIdUseCase);
  private readonly createNoteUseCase = inject(CreateNoteUseCase);
  private readonly updateNoteUseCase = inject(UpdateNoteUseCase);
  private readonly deleteNoteUseCase = inject(DeleteNoteUseCase);
  private readonly dialogService = inject(DialogService);

  folderId = '';
  noteId = '';
  title = '';
  content = '';
  errorMessage = '';
  isLoading = true;
  isDirty = false;
  isOptionsOpen = false;
  formattedFullDate = '';
  isDateVisible = false;

  private lastScrollTop = 0;
  private gestureStartY?: number;
  private dateHideTimeout?: ReturnType<typeof setTimeout>;

  private readonly saveSubject = new Subject<void>();
  private readonly autoSaveSubscription: Subscription;
  private noteSubscription?: Subscription;
  private readonly routeSubscription: Subscription;

  constructor() {
    this.autoSaveSubscription = this.saveSubject.pipe(
      debounceTime(800)
    ).subscribe(() => {
      if (this.isDirty) {
        void this.save();
      }
    });

    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const folderId = params.get('folderId') ?? '';
      const noteId = params.get('noteId') ?? '';

      if (folderId !== this.folderId) {
        this.folderId = folderId;
      }

      if (noteId !== this.noteId) {
        this.noteId = noteId;

        if (this.noteId === 'new') {
          this.noteSubscription?.unsubscribe();
          this.noteSubscription = undefined;
          this.title = '';
          this.content = '';
          this.formattedFullDate = this.formatFullDate(new Date());
          this.isLoading = false;
          this.isDirty = false;
        } else {
          this.isLoading = true;
          this.subscribeToNote(this.noteId);
        }
      }
    });
  }

  private subscribeToNote(noteId: string) {
    this.noteSubscription?.unsubscribe();
    this.noteSubscription = this.getNoteByIdUseCase.execute(noteId).subscribe({
      next: (res) => {
        const note = res.data;
        if (note && !this.isDirty) {
          this.title = note.title;
          this.content = note.content;
          this.formattedFullDate = this.formatFullDate(note.updatedAt?.toDate?.() || new Date());
        }
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar la nota.';
        this.isLoading = false;
      }
    });
  }

  // ─── Scroll / Gesture handlers ────────────────────────────────────────────

  handleScroll(event: Event) {
    const scrollTop = (event as CustomEvent<{ scrollTop: number }>).detail?.scrollTop ?? 0;
    const delta = scrollTop - this.lastScrollTop;

    if (scrollTop <= SCROLL_TOP_THRESHOLD && delta <= 0) {
      // Está cerca del tope (incluyendo rubber-band negativo)
      this.setDateVisible(true);
    } else if (delta > SCROLL_DOWN_DELTA) {
      // Desplazamiento notable hacia abajo → ocultar
      this.setDateVisible(false);
    } else if (delta < SCROLL_UP_DELTA && scrollTop < SCROLL_NEAR_TOP) {
      // Deslizamiento rápido hacia arriba cerca del top → mostrar
      this.setDateVisible(true);
    }

    this.lastScrollTop = Math.max(0, scrollTop);
  }

  handleGestureStart(event: TouchEvent) {
    this.gestureStartY = event.touches[0]?.clientY;
  }

  handleGestureMove(event: TouchEvent) {
    const currentY = event.touches[0]?.clientY;

    if (this.gestureStartY !== undefined && currentY !== undefined) {
      const deltaY = currentY - this.gestureStartY;
      if (deltaY > 10 && this.lastScrollTop <= 12) {
        this.setDateVisible(true);
      } else if (deltaY < -10) {
        this.setDateVisible(false);
      }
    }
  }

  handleGestureEnd() {
    this.gestureStartY = undefined;
    if (this.isDateVisible && this.lastScrollTop > SCROLL_TOP_THRESHOLD) {
      clearTimeout(this.dateHideTimeout);
      this.dateHideTimeout = setTimeout(() => {
        this.setDateVisible(false);
      }, DATE_HIDE_DELAY_MS);
    }
  }

  handleGestureCancel() {
    this.gestureStartY = undefined;
  }

  private setDateVisible(visible: boolean) {
    if (this.isDateVisible !== visible) {
      this.isDateVisible = visible;
    }
  }

  // ─── Options popover ──────────────────────────────────────────────────────

  openOptions() {
    this.isOptionsOpen = true;
  }

  closeOptions() {
    this.isOptionsOpen = false;
  }

  // ─── Actions ─────────────────────────────────────────────────────────────

  shareNote() {
    if (navigator.share) {
      void navigator.share({
        title: this.title || 'Nota',
        text: `${this.title ? this.title + '\n\n' : ''}${this.content}`
      });
    }
  }

  createAnotherNote() {
    if (this.isDirty) {
      void this.save();
    }
    void this.navService.goToCreateNote(this.folderId);
  }

  async deleteNote() {
    this.closeOptions();

    const confirmed = await this.dialogService.confirm({
      title: 'Eliminar nota',
      message: `¿Estás seguro de que deseas eliminar "${this.title || 'esta nota'}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash-outline'
    });

    if (confirmed) {
      await this.performDelete();
    }
  }

  private async performDelete() {
    try {
      if (this.noteId !== 'new') {
        const res = await this.deleteNoteUseCase.execute({ id: this.noteId });
        if (!res.success) {
          this.errorMessage = res.message || 'No se pudo eliminar la nota.';
          return;
        }
      }
      await this.backToNotes();
    } catch {
      this.errorMessage = 'No se pudo eliminar la nota.';
    }
  }

  onTitleChange() {
    this.isDirty = true;
    this.saveSubject.next();
  }

  onContentChange() {
    this.isDirty = true;
    this.saveSubject.next();
  }

  async save() {
    const effectiveTitle = this.title.trim() || (this.content.trim().split('\n')[0]?.trim() || '');
    if (!effectiveTitle) {
      return;
    }

    try {
      if (this.noteId === 'new') {
        const res = await this.createNoteUseCase.execute({
          folderId: this.folderId,
          title: effectiveTitle,
          content: this.content
        });
        if (!res.success || !res.data) {
          this.errorMessage = res.message || 'No se pudo crear la nota.';
          return;
        }
        const note = res.data;
        this.noteId = note.id;
        this.isDirty = false;
        this.subscribeToNote(note.id);
        await this.navService.replaceNoteUrl(this.folderId, note.id);
        return;
      }

      const res = await this.updateNoteUseCase.execute({
        id: this.noteId,
        title: effectiveTitle,
        content: this.content
      });
      if (!res.success) {
        this.errorMessage = res.message || 'No se pudo guardar la nota.';
        return;
      }
      this.isDirty = false;
    } catch {
      this.errorMessage = 'No se pudo guardar la nota.';
    }
  }

  async backToNotes() {
    if (this.isDirty) {
      await this.save();
    }
    return this.navService.backToNotes(this.folderId);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private formatFullDate(date: Date): string {
    const day = date.getDate();
    const month = new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(date);
    const year = date.getFullYear();
    const time = new Intl.DateTimeFormat('es-PE', { hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
    return `${day} de ${month} de ${year} a las ${time}`;
  }

  ngOnDestroy() {
    clearTimeout(this.dateHideTimeout);
    // Guardar antes de cancelar suscripciones para no perder cambios pendientes
    if (this.isDirty) {
      void this.save();
    }
    this.autoSaveSubscription.unsubscribe();
    this.noteSubscription?.unsubscribe();
    this.routeSubscription.unsubscribe();
  }
}
