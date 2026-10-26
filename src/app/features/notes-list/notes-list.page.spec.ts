import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ActionSheetController, IonicModule } from '@ionic/angular';
import { Timestamp } from 'firebase/firestore';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { Note } from '../../core/models/note/note.model';
import { createSuccessResult } from '../../core/models/result.model';
import { NavigationService } from '../../core/navigation/navigation.service';
import { ChordTransposerService } from '../../core/services/chord-transposer.service';
import { GetFolderByIdUseCase } from '../../core/use-cases/folders';
import { DeleteNoteUseCase, GetNotesByFolderUseCase } from '../../core/use-cases/notes';
import { NotesListPage } from './notes-list.page';

describe('NotesListPage - Song and Note Display', () => {
  let component: NotesListPage;
  let fixture: ComponentFixture<NotesListPage>;

  const dummyTimestamp = Timestamp.now();

  const getNotesByFolderUseCaseMock = {
    execute: () => of(createSuccessResult([]))
  };

  const getFolderByIdUseCaseMock = {
    execute: () => of(createSuccessResult({ id: 'f1', name: 'Alabanza' } as any))
  };

  const deleteNoteUseCaseMock = {
    execute: () => Promise.resolve(createSuccessResult(undefined))
  };

  const navServiceMock = {
    push: () => Promise.resolve(),
    back: () => Promise.resolve()
  };

  const actionSheetCtrlMock = {
    create: () => Promise.resolve({ present: () => Promise.resolve() })
  };

  const activatedRouteMock = {
    snapshot: {
      paramMap: {
        get: (key: string) => (key === 'folderId' ? 'f1' : null)
      }
    }
  };

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), NotesListPage],
      providers: [
        ChordTransposerService,
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: NavigationService, useValue: navServiceMock },
        { provide: GetNotesByFolderUseCase, useValue: getNotesByFolderUseCaseMock },
        { provide: GetFolderByIdUseCase, useValue: getFolderByIdUseCaseMock },
        { provide: DeleteNoteUseCase, useValue: deleteNoteUseCaseMock },
        { provide: ActionSheetController, useValue: actionSheetCtrlMock }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(NotesListPage);
    component = fixture.componentInstance;
  });

  it('should identify a music note when type is music', () => {
    const musicNote: Note = {
      id: 'n1',
      userId: 'u1',
      folderId: 'f1',
      title: 'Rey de Reyes',
      content: 'A / B / C',
      type: 'music',
      createdAt: dummyTimestamp,
      updatedAt: dummyTimestamp
    };

    expect(component.isSong(musicNote)).toBe(true);
  });

  it('should identify a standard note when type is standard', () => {
    const standardNote: Note = {
      id: 'n2',
      userId: 'u1',
      folderId: 'f1',
      title: 'Lista de compras',
      content: 'Comprar pan',
      type: 'standard',
      createdAt: dummyTimestamp,
      updatedAt: dummyTimestamp
    };

    expect(component.isSong(standardNote)).toBe(false);
  });

  it('should return song key info with base key for songs', () => {
    const musicNote: Note = {
      id: 'n3',
      userId: 'u1',
      folderId: 'f1',
      title: 'Way Maker',
      content: 'Intro:\nG / D / Em / C /',
      type: 'music',
      author: 'Sinach',
      createdAt: dummyTimestamp,
      updatedAt: dummyTimestamp
    };

    const keyInfo = component.getSongKeyInfo(musicNote);
    expect(keyInfo).not.toBeNull();
    expect(keyInfo?.baseKey).toBe('G');
    expect(keyInfo?.isTransposed).toBe(false);
  });

  it('should return transposed key info when note has saved offset in localStorage', () => {
    localStorage.setItem('notechord_transpose_n4', '2');

    const musicNote: Note = {
      id: 'n4',
      userId: 'u1',
      folderId: 'f1',
      title: 'Way Maker',
      content: 'Intro:\nA / E / F#m / D /',
      type: 'music',
      createdAt: dummyTimestamp,
      updatedAt: dummyTimestamp
    };

    const keyInfo = component.getSongKeyInfo(musicNote);
    expect(keyInfo).not.toBeNull();
    expect(keyInfo?.baseKey).toBe('A');
    expect(keyInfo?.transposedKey).toBe('B');
    expect(keyInfo?.isTransposed).toBe(true);
    expect(keyInfo?.offset).toBe(2);
  });
});

