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
import { ChordTransposerService } from '../../core/services/chord-transposer.service';
import { SharedModule } from '../../shared/shared.module';

export type SearchFilterType = 'all' | 'music' | 'standard';

export interface SearchNoteItem extends Note {
  folderName: string;
}

export interface SongKeyInfo {
  baseKey: string;
  transposedKey?: string;
  isTransposed: boolean;
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
  private readonly chordTransposer = inject(ChordTransposerService);

  @ViewChild('searchInput') searchInputElement?: ElementRef<HTMLInputElement>;

  readonly searchTerm$ = new BehaviorSubject<string>('');
  searchTerm = '';

  readonly activeFilter$ = new BehaviorSubject<SearchFilterType>('all');
  activeFilter: SearchFilterType = 'all';

  private readonly allNotes$: Observable<Note[]> = this.getAllNotesUseCase.execute().pipe(
    map((res) => res.data || [])
  );
  private readonly folders$: Observable<Folder[]> = this.getFoldersUseCase.execute().pipe(
    map((res) => res.data || [])
  );

  readonly matchingNotes$: Observable<SearchNoteItem[]> = combineLatest([
    this.allNotes$,
    this.folders$,
    this.searchTerm$,
    this.activeFilter$
  ]).pipe(
    map(([notes, folders, term, filter]) => {
      const cleanTerm = term.trim().toLocaleLowerCase();
      if (!cleanTerm) {
        return [];
      }
      const folderMap = new Map<string, string>(folders.map((f) => [f.id, f.name]));
      return notes
        .filter((note) => {
          if (filter === 'standard' && this.isSong(note)) {
            return false;
          }
          if (filter === 'music' && !this.isSong(note)) {
            return false;
          }

          const matchesTitle = note.title.toLocaleLowerCase().includes(cleanTerm);
          const matchesContent = note.content ? note.content.toLocaleLowerCase().includes(cleanTerm) : false;
          const matchesAuthor = note.author ? note.author.toLocaleLowerCase().includes(cleanTerm) : false;

          return matchesTitle || matchesContent || matchesAuthor;
        })
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
    this.searchTerm$,
    this.activeFilter$
  ]).pipe(
    map(([folders, term, filter]) => {
      // Las carpetas solo se muestran en el filtro "Todo"
      if (filter !== 'all') {
        return [];
      }
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

  setFilter(filter: SearchFilterType) {
    this.activeFilter = filter;
    this.activeFilter$.next(filter);
  }

  isSong(note: Note): boolean {
    return note.type === 'music' || (!note.type && !!(note.author || (note.content && this.chordTransposer.detectOriginalKey(note.content))));
  }

  hasPreview(note: Note): boolean {
    return !!(note.content && note.content.trim().length > 0);
  }

  getSongKeyInfo(note: Note): SongKeyInfo | null {
    if (!this.isSong(note) || !note.content) return null;
    const baseKey = this.chordTransposer.detectOriginalKey(note.content);
    if (!baseKey) return null;

    const offset = this.getSavedTranspositionOffset(note.id);
    if (offset !== 0) {
      const transposedKey = this.chordTransposer.transposeNote(baseKey, offset, false);
      return {
        baseKey,
        transposedKey,
        isTransposed: true
      };
    }

    return {
      baseKey,
      isTransposed: false
    };
  }

  private getSavedTranspositionOffset(noteId: string): number {
    try {
      const saved = localStorage.getItem(`notechord_transpose_${noteId}`);
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
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

