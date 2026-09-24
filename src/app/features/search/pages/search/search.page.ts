import { Component, ElementRef, ViewChild, inject, AfterViewInit } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';

import { Note } from '../../../notes/models/note.model';
import { NoteService } from '../../../notes/services/note.service';
import { Folder } from '../../../folders/models/folder.model';
import { FolderService } from '../../../folders/services/folder.service';
import { NavigationService } from '../../../../core/navigation/navigation.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
  standalone: false
})
export class SearchPage implements AfterViewInit {
  private readonly noteService = inject(NoteService);
  private readonly folderService = inject(FolderService);
  private readonly navService = inject(NavigationService);

  @ViewChild('searchInput') searchInputElement?: ElementRef<HTMLInputElement>;

  readonly searchTerm$ = new BehaviorSubject<string>('');
  searchTerm = '';

  readonly matchingNotes$: Observable<Note[]> = combineLatest([
    this.noteService.allNotes$,
    this.searchTerm$
  ]).pipe(
    map(([notes, term]) => {
      const cleanTerm = term.trim().toLocaleLowerCase();
      if (!cleanTerm) {
        return [];
      }
      return notes.filter((note) =>
        note.title.toLocaleLowerCase().includes(cleanTerm) ||
        note.content.toLocaleLowerCase().includes(cleanTerm)
      );
    })
  );

  readonly matchingFolders$: Observable<Folder[]> = combineLatest([
    this.folderService.folders$,
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
    return this.navService.goToNoteEditor(note.folderId, note.id);
  }

  selectFolder(folder: Folder) {
    return this.navService.goToFolderNotes(folder.id);
  }
}

