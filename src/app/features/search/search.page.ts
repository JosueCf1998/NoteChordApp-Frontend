import { Component, ElementRef, ViewChild, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';

import { Note } from '../../core/models/note/note.model';
import { Folder } from '../../core/models/folder/folder.model';
import { GetAllNotesUseCase } from '../../core/use-cases/notes';
import { GetFoldersUseCase } from '../../core/use-cases/folders';
import { NavigationService } from '../../core/navigation/navigation.service';
import { SharedModule } from '../../shared/shared.module';

export interface SearchNoteItem extends Note {
  folderName: string;
}

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, SharedModule]
})
export class SearchPage implements AfterViewInit {
  private readonly getAllNotesUseCase = inject(GetAllNotesUseCase);
  private readonly getFoldersUseCase = inject(GetFoldersUseCase);
  private readonly navService = inject(NavigationService);

  @ViewChild('searchInput') searchInputElement?: ElementRef<HTMLInputElement>;

  readonly searchTerm$ = new BehaviorSubject<string>('');
  searchTerm = '';

  private readonly allNotes$: Observable<Note[]> = this.getAllNotesUseCase.execute().pipe(
    map((res) => res.data || [])
  );
  private readonly folders$: Observable<Folder[]> = this.getFoldersUseCase.execute().pipe(
    map((res) => res.data || [])
  );

  readonly matchingNotes$: Observable<SearchNoteItem[]> = combineLatest([
    this.allNotes$,
    this.folders$,
    this.searchTerm$
  ]).pipe(
    map(([notes, folders, term]) => {
      const cleanTerm = term.trim().toLocaleLowerCase();
      if (!cleanTerm) {
        return [];
      }
      const folderMap = new Map<string, string>(folders.map((f) => [f.id, f.name]));
      return notes
        .filter((note) =>
          note.title.toLocaleLowerCase().includes(cleanTerm) ||
          note.content.toLocaleLowerCase().includes(cleanTerm)
        )
        .sort((a, b) => {
          const timeA = (a.updatedAt as any)?.toMillis?.() ?? (a.updatedAt as any)?.seconds * 1000 ?? 0;
          const timeB = (b.updatedAt as any)?.toMillis?.() ?? (b.updatedAt as any)?.seconds * 1000 ?? 0;
          return timeB - timeA;
        })
        .map((note) => ({
          ...note,
          folderName: folderMap.get(note.folderId) || 'Notas'
        }));
    })
  );

  readonly matchingFolders$: Observable<Folder[]> = combineLatest([
    this.folders$,
    this.searchTerm$
  ]).pipe(
    map(([folders, term]) => {
      const cleanTerm = term.trim().toLocaleLowerCase();
      if (!cleanTerm) {
        return [];
      }
      return folders.filter((folder) =>
        folder.name.toLocaleLowerCase().includes(cleanTerm)
      );
    })
  );

  ngAfterViewInit() {
    setTimeout(() => {
      this.searchInputElement?.nativeElement.focus();
    }, 250);
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value || '';
    this.searchTerm = value;
    this.searchTerm$.next(value);
  }

  clearSearch() {
    this.searchTerm = '';
    this.searchTerm$.next('');
    this.searchInputElement?.nativeElement.focus();
  }

  cancel() {
    return this.navService.back();
  }

  selectNote(note: Note) {
    return this.navService.push(['/notes', note.folderId, note.id]);
  }

  selectFolder(folder: Folder) {
    return this.navService.push(['/notes-list', folder.id]);
  }
}

