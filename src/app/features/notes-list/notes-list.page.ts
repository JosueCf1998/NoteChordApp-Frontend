import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActionSheetController, IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';

import { Note } from '../../core/models/note/note.model';
import {
  GetNotesByFolderUseCase,
  DeleteNoteUseCase
} from '../../core/use-cases/notes';
import { GetFolderByIdUseCase } from '../../core/use-cases/folders';
import { NavigationService } from '../../core/navigation/navigation.service';
import { AnimatedPageTitleComponent } from '../../shared/components/animated-page-title/animated-page-title.component';
import { SharedModule } from '../../shared/shared.module';

export interface NoteGroup {
  label: string;
  notes: Note[];
}

@Component({
  selector: 'app-notes-list',
  templateUrl: './notes-list.page.html',
  styleUrls: ['./notes-list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, SharedModule]
})
export class NotesListPage {
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

  createNote() {
    return this.navService.push(['/notes', this.folderId, 'new']);
  }

  openNote(note: Note) {
    return this.navService.push(['/notes', this.folderId, note.id]);
  }

  openSearch() {
    return this.navService.push('/search');
  }

  private getNoteDate(note: Note): Date | null {
    const ts = note.updatedAt;
    if (!ts) return null;
    if (ts instanceof Date) return ts;
    if (typeof (ts as any).toDate === 'function') return (ts as any).toDate();
    if (typeof (ts as any).seconds === 'number') return new Date((ts as any).seconds * 1000);
    const parsed = new Date(ts as any);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  private getNoteTime(note: Note): number {
    return this.getNoteDate(note)?.getTime() ?? 0;
  }

  private groupNotes(notes: Note[]): NoteGroup[] {
    const sortedNotes = [...notes].sort((a, b) => this.getNoteTime(b) - this.getNoteTime(a));
    const groups = new Map<string, NoteGroup>();

    for (const note of sortedNotes) {
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

  private noteGroupLabel(note: Note): string {
    const date = this.getNoteDate(note);

    if (!date) {
      return 'Recientes';
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const noteDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const daysAgo = Math.floor((today.getTime() - noteDay.getTime()) / 86400000);

    // Mismo día (hoy) o futuro por desfase
    if (daysAgo <= 0) {
      return 'Hoy';
    }

    // Últimos 7 días (de 1 a 7 días atrás)
    if (daysAgo <= 7) {
      return 'Últimos 7 días';
    }

    // Últimos 30 días (de 8 a 30 días atrás)
    if (daysAgo <= 30) {
      return 'Últimos 30 días';
    }

    // Meses del año actual
    const month = new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(date);
    const capitalizedMonth = month.charAt(0).toLocaleUpperCase() + month.slice(1);

    if (date.getFullYear() === now.getFullYear()) {
      return capitalizedMonth;
    }

    // Meses + Año para años anteriores
    return `${capitalizedMonth} de ${date.getFullYear()}`;
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
          handler: () => void this.openNote(note)
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
    return this.navService.back();
  }

  openSettings() {
    return this.navService.push('/settings');
  }
}

