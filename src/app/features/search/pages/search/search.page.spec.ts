import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SearchPage } from './search.page';
import { NoteService } from '../../../notes/services/note.service';
import { FolderService } from '../../../folders/services/folder.service';
import { NavigationService } from '../../../../core/navigation/navigation.service';
import { Note } from '../../../notes/models/note.model';
import { Folder } from '../../../folders/models/folder.model';

describe('SearchPage', () => {
  let component: SearchPage;
  let fixture: ComponentFixture<SearchPage>;

  const mockNotes: Note[] = [
    {
      id: 'note-1',
      folderId: 'folder-1',
      title: 'Nota de bienvenida',
      content: 'Contenido sobre música',
      userId: 'user-1',
      createdAt: { toDate: () => new Date() } as any,
      updatedAt: { toDate: () => new Date() } as any
    },
    {
      id: 'note-2',
      folderId: 'folder-2',
      title: 'Lista de compras',
      content: 'Comprar cuerdas de guitarra',
      userId: 'user-1',
      createdAt: { toDate: () => new Date() } as any,
      updatedAt: { toDate: () => new Date() } as any
    }
  ];

  const mockFolders: Folder[] = [
    {
      id: 'folder-1',
      name: 'Música y Acordes',
      color: '#3164F4',
      description: 'Canciones',
      userId: 'user-1',
      createdAt: { toDate: () => new Date() } as any,
      updatedAt: { toDate: () => new Date() } as any
    },
    {
      id: 'folder-2',
      name: 'Personal',
      color: '#3164F4',
      description: '',
      userId: 'user-1',
      createdAt: { toDate: () => new Date() } as any,
      updatedAt: { toDate: () => new Date() } as any
    }
  ];

  const noteServiceMock = {
    allNotes$: of(mockNotes)
  };

  const folderServiceMock = {
    folders$: of(mockFolders)
  };

  const navServiceMock = {
    goToNoteEditor: vi.fn().mockResolvedValue(true),
    goToFolderNotes: vi.fn().mockResolvedValue(true),
    back: vi.fn().mockResolvedValue(true)
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      declarations: [SearchPage],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: NoteService, useValue: noteServiceMock },
        { provide: FolderService, useValue: folderServiceMock },
        { provide: NavigationService, useValue: navServiceMock }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    })
    .overrideComponent(SearchPage, {
      set: { template: '<div></div>' }
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return empty results when search term is empty', async () => {
    let notes: Note[] = [];
    let folders: Folder[] = [];

    component.matchingNotes$.subscribe((n) => (notes = n));
    component.matchingFolders$.subscribe((f) => (folders = f));

    expect(notes.length).toBe(0);
    expect(folders.length).toBe(0);
  });

  it('should filter notes and folders matching search term', async () => {
    let notes: Note[] = [];
    let folders: Folder[] = [];

    component.matchingNotes$.subscribe((n) => (notes = n));
    component.matchingFolders$.subscribe((f) => (folders = f));

    component.onSearchInput({ target: { value: 'música' } } as unknown as Event);

    expect(notes.length).toBe(1);
    expect(notes[0].id).toBe('note-1');
    expect(folders.length).toBe(1);
    expect(folders[0].id).toBe('folder-1');
  });

  it('should filter notes by content match as well', async () => {
    let notes: Note[] = [];
    component.matchingNotes$.subscribe((n) => (notes = n));

    component.onSearchInput({ target: { value: 'cuerdas' } } as unknown as Event);

    expect(notes.length).toBe(1);
    expect(notes[0].id).toBe('note-2');
  });

  it('should navigate to note editor when note is selected', () => {
    component.selectNote(mockNotes[0]);
    expect(navServiceMock.goToNoteEditor).toHaveBeenCalledWith('folder-1', 'note-1');
  });

  it('should navigate to folder notes when folder is selected', () => {
    component.selectFolder(mockFolders[0]);
    expect(navServiceMock.goToFolderNotes).toHaveBeenCalledWith('folder-1');
  });

  it('should navigate back when cancel is clicked', () => {
    component.cancel();
    expect(navServiceMock.back).toHaveBeenCalled();
  });

  it('should clear search term on clearSearch()', () => {
    component.searchTerm = 'prueba';
    component.clearSearch();
    expect(component.searchTerm).toBe('');
    expect(component.searchTerm$.value).toBe('');
  });
});

