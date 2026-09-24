import { Component, ViewChild, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ActionSheetController, IonicModule } from '@ionic/angular';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';

import { Note } from '../../core/models/note/note.model';
import { GetNotesByFolderUseCase, DeleteNoteUseCase } from '../../core/use-cases/notes';
import { GetFolderByIdUseCase } from '../../core/use-cases/folders';
import { NavigationService } from '../../core/navigation/navigation.service';
import { AnimatedPageTitleComponent } from '../../shared/components/animated-page-title/animated-page-title.component';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';

interface NoteGroup {
  label: string;
  notes: Note[];
}

@Component({
  selector: 'app-notes',
  templateUrl: './notes.page.html',
  styleUrls: ['./notes.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, SharedModule]
})
export class NotesPage {
  private readonly route = inject(ActivatedRoute);
  private readonly navService = inject(NavigationService);
  private readonly getNotesByFolderUseCase = inject(GetNotesByFolderUseCase);
  private readonly getFolderByIdUseCase = inject(GetFolderByIdUseCase);
  private readonly deleteNoteUseCase = inject(DeleteNoteUseCase);
  private readonly actionSheetController = inject(ActionSheetController);

  @ViewChild(AnimatedPageTitleComponent) pageTitle?: AnimatedPageTitleComponent;

  readonly folderId = this.route.snapshot.paramMap.get('folderId') ?? '';
  readonly notes$ = this.getNotesByFolderUseCase.execute(this.folderId).pipe(
    map((res) => res.data || [])
  );
  readonly folder$ = this.getFolderByIdUseCase.execute({ id: this.folderId }).pipe(
    map((res) => res.data)
  );
  readonly searchTerm$ = new BehaviorSubject<string>('');

  readonly filteredNotes$: Observable<Note[]> = combineLatest([
    this.notes$,
    this.searchTerm$
  ]).pipe(
    map(([notes, term]) => {
      const search = term.trim().toLocaleLowerCase();
      if (!search) {
        return notes;
      }
      return notes.filter((note) => note.title.toLocaleLowerCase().includes(search));
    })
  );

  readonly noteGroups$: Observable<NoteGroup[]> = this.filteredNotes$.pipe(
    map((notes) => this.groupNotes(notes))
  );

  searchTerm = '';
  isHeaderCollapsed = false;
  isDeleting = false;
  pendingDelete: { id: string; title: string } | null = null;
  errorMessage = '';

  onSearchChange(term: string) {
    this.searchTerm = term;
    this.searchTerm$.next(term);
  }

  handleScroll(event: Event) {
    this.pageTitle?.handleScroll(event);
  }

  handleGestureStart(event: TouchEvent) {
    this.pageTitle?.handleGestureStart(event);
  }

  handleGestureMove(event: TouchEvent) {
    this.pageTitle?.handleGestureMove(event);
  }

  handleGestureEnd(event: TouchEvent) {
    void this.pageTitle?.handleGestureEnd(event);
  }

  handleGestureCancel() {
    this.pageTitle?.handleGestureCancel();
  }

  toggleCreateForm() {
    void this.navService.goToCreateNote(this.folderId);
  }

  openSearch() {
    return this.navService.goToSearch();
  }

  private groupNotes(notes: Note[]): NoteGroup[] {
    const groups = new Map<string, NoteGroup>();

    for (const note of notes) {
      const label = this.noteGroupLabel(note);
      const group = groups.get(label);

      if (group) {
        group.notes.push(note);
      } else {
        groups.set(label, { label, notes: [note] });
      }
    }

    return [...groups.values()];
  }

  private noteGroupLabel(note: Note) {
    const date = note.updatedAt?.toDate?.();

    if (!date) {
      return 'Recientes';
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const noteDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const daysAgo = Math.floor((today.getTime() - noteDay.getTime()) / 86400000);

    if (daysAgo >= 0 && daysAgo < 7) {
      return 'Últimos 7 días';
    }

    if (daysAgo >= 0 && daysAgo < 30) {
      return 'Últimos 30 días';
    }

    if (date.getFullYear() === now.getFullYear()) {
      const month = new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(date);
      return month.charAt(0).toLocaleUpperCase() + month.slice(1);
    }

    return String(date.getFullYear());
  }

  openNote(noteId: string) {
    return this.navService.goToNoteEditor(this.folderId, noteId);
  }

  deleteNote(noteId: string, title: string) {
    this.pendingDelete = { id: noteId, title };
  }

  cancelNoteDelete() {
    this.pendingDelete = null;
  }

  confirmNoteDelete() {
    const note = this.pendingDelete;

    if (note) {
      this.isDeleting = true;
      void this.performNoteDelete(note.id);
    }
  }

  async openNoteOptions(note: Note) {
    const sheet = await this.actionSheetController.create({
      header: note.title,
      buttons: [
        {
          text: 'Editar',
          icon: 'pencil-outline',
          handler: () => void this.openNote(note.id)
        },
        {
          text: 'Eliminar',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => void this.deleteNote(note.id, note.title)
        },
        { text: 'Cancelar', role: 'cancel' }
      ]
    });
    await sheet.present();
  }

  private async performNoteDelete(noteId: string) {
    try {
      const res = await this.deleteNoteUseCase.execute({ id: noteId });
      if (!res.success) {
        this.errorMessage = res.message || 'No se pudo eliminar la nota.';
      }
    } catch {
      this.errorMessage = 'No se pudo eliminar la nota.';
    } finally {
      this.isDeleting = false;
      this.pendingDelete = null;
    }
  }

  backToFolders() {
    return this.navService.backToFolders();
  }

  openSettings() {
    return this.navService.goToSettings();
  }
}
