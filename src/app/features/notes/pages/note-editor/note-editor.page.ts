import { Component, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Keyboard } from '@capacitor/keyboard';
import { Observable, Subscription, of } from 'rxjs';
import { AlertController } from '@ionic/angular';

import { Folder } from '../../../folders/models/folder.model';
import { FolderService } from '../../../folders/services/folder.service';
import { NoteService } from '../../services/note.service';

interface NoteSection {
  title: string;
  content: string;
}

@Component({
  selector: 'app-note-editor',
  templateUrl: './note-editor.page.html',
  styleUrls: ['./note-editor.page.scss'],
  standalone: false
})
export class NoteEditorPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly noteService = inject(NoteService);
  private readonly folderService = inject(FolderService);
  private readonly alertController = inject(AlertController);

  folderId = '';
  noteId = '';
  folder$: Observable<Folder | null> = of(null);
  title = '';
  content = '';
  errorMessage = '';
  statusMessage = '';
  isLoading = true;
  isSaving = false;
  isDirty = false;
  isViewMode = false;
  isOptionsOpen = false;
  updatedAtLabel = '';
  sections: NoteSection[] = [];
  private noteSubscription?: Subscription;
  private readonly routeSubscription: Subscription;

  constructor() {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const folderId = params.get('folderId') ?? '';
      const noteId = params.get('noteId') ?? '';

      if (folderId !== this.folderId) {
        this.folderId = folderId;
        this.folder$ = this.folderService.watch(this.folderId);
      }

      if (noteId !== this.noteId) {
        this.noteId = noteId;

        if (this.noteId === 'new') {
          this.noteSubscription?.unsubscribe();
          this.noteSubscription = undefined;
          this.title = '';
          this.content = '';
          this.sections = [];
          this.updatedAtLabel = '';
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
    this.noteSubscription = this.noteService.watch(noteId).subscribe({
      next: (note) => {
        if (note && !this.isDirty) {
          this.title = note.title;
          this.content = note.content;
          this.updatedAtLabel = this.formatUpdatedAt(note.updatedAt?.toDate?.());
          this.updateSections();
        }
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar la nota.';
        this.isLoading = false;
      }
    });
  }

  async setViewMode(isViewMode: boolean) {
    if (this.isViewMode === isViewMode) {
      return;
    }

    if (isViewMode) {
      (document.activeElement as HTMLElement | null)?.blur?.();
      await Keyboard.hide().catch(() => undefined);
    }

    this.isViewMode = isViewMode;
  }

  toggleViewMode() {
    return this.setViewMode(!this.isViewMode);
  }

  openOptions() {
    this.isOptionsOpen = true;
  }

  shareNote() {
    const share = navigator.share;

    if (share) {
      void share.call(navigator, { title: this.title || 'Nota', text: this.content });
    }
  }

  createAnotherNote() {
    void this.router.navigate(['/notes', this.folderId, 'new']);
  }

  closeOptions() {
    this.isOptionsOpen = false;
  }

  async deleteNote() {
    this.closeOptions();

    const alert = await this.alertController.create({
      header: 'Eliminar nota',
      message: `¿Quieres eliminar “${this.title}”?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => void this.performDelete()
        }
      ]
    });
    await alert.present();
  }

  private async performDelete() {
    try {
      await this.noteService.delete(this.noteId);
      await this.backToNotes();
    } catch {
      this.errorMessage = 'No se pudo eliminar la nota.';
    }
  }

  async save() {
    this.errorMessage = '';
    this.statusMessage = '';

    if (!this.title.trim()) {
      this.errorMessage = 'El título es obligatorio.';
      return;
    }

    this.isSaving = true;

    try {
      if (this.noteId === 'new') {
        const note = await this.noteService.create(this.folderId, this.title, this.content);
        this.noteId = note.id;
        this.isDirty = false;
        this.statusMessage = 'Guardado';
        this.subscribeToNote(note.id);
        await this.router.navigate(['/notes', this.folderId, note.id], { replaceUrl: true });
        return;
      }

      await this.noteService.update(this.noteId, this.title, this.content);
      this.isDirty = false;
      this.statusMessage = 'Guardado';
    } catch {
      this.errorMessage = 'No se pudo guardar la nota.';
    } finally {
      this.isSaving = false;
    }
  }

  backToNotes() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    return this.router.navigate(['/notes', this.folderId]);
  }

  markDirty() {
    this.isDirty = true;
    this.statusMessage = '';
  }

  onContentChange() {
    this.markDirty();
    this.updateSections();
  }

  private formatUpdatedAt(date?: Date) {
    if (!date) {
      return 'Guardando…';
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const noteDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const difference = Math.round((today.getTime() - noteDay.getTime()) / 86400000);
    const time = new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' }).format(date);

    if (difference === 0) {
      return `Hoy, ${time}`;
    }

    if (difference === 1) {
      return `Ayer, ${time}`;
    }

    return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' }).format(date);
  }

  private updateSections() {
    const lines = this.content.split(/\r?\n/);
    const sections: NoteSection[] = [];
    let currentSection: NoteSection | null = null;
    let unsectionedContent: string[] = [];

    for (const line of lines) {
      const heading = line.match(/^\s*(.+?):\s*$/);

      if (heading) {
        if (currentSection) {
          sections.push(currentSection);
        } else if (unsectionedContent.some((item) => item.trim())) {
          sections.push({ title: 'Contenido', content: unsectionedContent.join('\n').trim() });
        }

        currentSection = { title: heading[1].trim(), content: '' };
        unsectionedContent = [];
        continue;
      }

      if (currentSection) {
        currentSection.content += `${currentSection.content ? '\n' : ''}${line}`;
      } else {
        unsectionedContent.push(line);
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    } else if (unsectionedContent.some((item) => item.trim())) {
      sections.push({ title: 'Contenido', content: unsectionedContent.join('\n').trim() });
    }

    this.sections = sections;
  }

  ngOnDestroy() {
    this.noteSubscription?.unsubscribe();
    this.routeSubscription.unsubscribe();
  }
}
