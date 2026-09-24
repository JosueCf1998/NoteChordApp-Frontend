import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionSheetController, IonicModule } from '@ionic/angular';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach } from 'vitest';

import { AuthService } from '../../core/auth/auth.service';
import { GetNotesCountByFolderUseCase } from '../../core/use-cases/notes';
import { NavigationService } from '../../core/navigation/navigation.service';
import { FoldersPage } from './folders.page';

import {
  GetFoldersUseCase,
  CreateFolderUseCase,
  UpdateFolderUseCase,
  DeleteFolderUseCase
} from '../../core/use-cases/folders';
import { createSuccessResult } from '../../core/models/result.model';

describe('FoldersPage', () => {
  let component: FoldersPage;
  let fixture: ComponentFixture<FoldersPage>;

  const authServiceMock = {
    user$: of(null),
    currentUser: null,
    logout: () => Promise.resolve()
  };

  const getFoldersUseCaseMock = {
    execute: () => of(createSuccessResult([]))
  };

  const createFolderUseCaseMock = {
    execute: () => Promise.resolve(createSuccessResult({ id: '1', name: 'Test' } as any))
  };

  const updateFolderUseCaseMock = {
    execute: () => Promise.resolve(createSuccessResult(undefined))
  };

  const deleteFolderUseCaseMock = {
    execute: () => Promise.resolve(createSuccessResult(undefined))
  };

  const getNotesCountByFolderUseCaseMock = {
    execute: () => of(createSuccessResult({}))
  };

  const navServiceMock = {
    goToFolderNotes: () => Promise.resolve(true),
    goToSettings: () => Promise.resolve(true),
    goToLogin: () => Promise.resolve(true),
    goToSearch: () => Promise.resolve(true)
  };

  const actionSheetControllerMock = {
    create: () => Promise.resolve({ present: () => Promise.resolve() })
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), FoldersPage],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: GetFoldersUseCase, useValue: getFoldersUseCaseMock },
        { provide: CreateFolderUseCase, useValue: createFolderUseCaseMock },
        { provide: UpdateFolderUseCase, useValue: updateFolderUseCaseMock },
        { provide: DeleteFolderUseCase, useValue: deleteFolderUseCaseMock },
        { provide: GetNotesCountByFolderUseCase, useValue: getNotesCountByFolderUseCaseMock },
        { provide: NavigationService, useValue: navServiceMock },
        { provide: ActionSheetController, useValue: actionSheetControllerMock }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    })
    .overrideComponent(FoldersPage, {
      set: { template: '<div></div>', imports: [] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(FoldersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
