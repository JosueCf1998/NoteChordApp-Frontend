import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionSheetController, IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
import { FolderService } from '../../services/folder.service';
import { NoteService } from '../../../notes/services/note.service';
import { FoldersPage } from './folders.page';

describe('FoldersPage', () => {
  let component: FoldersPage;
  let fixture: ComponentFixture<FoldersPage>;

  const authServiceMock = {
    user$: of(null),
    currentUser: null,
    logout: () => Promise.resolve()
  };

  const folderServiceMock = {
    folders$: of([]),
    watch: () => of(null),
    create: () => Promise.resolve(),
    rename: () => Promise.resolve(),
    delete: () => Promise.resolve()
  };

  const noteServiceMock = {
    countsByFolder$: of({}),
    forFolder: () => of([])
  };

  const routerMock = {
    navigate: () => Promise.resolve(true),
    navigateByUrl: () => Promise.resolve(true)
  };

  const actionSheetControllerMock = {
    create: () => Promise.resolve({ present: () => Promise.resolve() })
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FoldersPage],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: FolderService, useValue: folderServiceMock },
        { provide: NoteService, useValue: noteServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActionSheetController, useValue: actionSheetControllerMock }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    })
    .overrideComponent(FoldersPage, {
      set: { template: '<div></div>' }
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
