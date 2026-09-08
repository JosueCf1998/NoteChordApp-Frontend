import { Component, ViewChild, inject } from '@angular/core';
import { ActionSheetController } from '@ionic/angular';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { Folder } from '../../models/folder.model';
import { FolderService } from '../../services/folder.service';
import { NoteService } from '../../../notes/services/note.service';
import { NavigationService } from '../../../../core/navigation/navigation.service';
import { FloatingSearchActionComponent } from '../../../../shared/components/floating-search-action/floating-search-action.component';

@Component({
  selector: 'app-folders',
  templateUrl: 'folders.page.html',
  styleUrls: ['folders.page.scss'],
  standalone: false,
})
export class FoldersPage {
  private readonly authService = inject(AuthService);
  private readonly folderService = inject(FolderService);
  private readonly noteService = inject(NoteService);
  private readonly navService = inject(NavigationService);
  private readonly actionSheetController = inject(ActionSheetController);

  private readonly defaultFolderColor = '#3164F4';
  @ViewChild(FloatingSearchActionComponent) folderSearch?: FloatingSearchActionComponent;
  readonly folders$ = this.folderService.folders$;
  readonly noteCounts$ = this.noteService.countsByFolder$;
  readonly searchTerm$ = new BehaviorSubject<string>('');
  readonly filteredFolders$: Observable<Folder[]> = combineLatest([
    this.folders$,
    this.searchTerm$
  ]).pipe(
    map(([folders, term]) => {
      const search = term.trim().toLocaleLowerCase();
      if (!search) {
        return folders;
      }
      return folders.filter((folder) => folder.name.toLocaleLowerCase().includes(search));
    })
  );
  folderName = '';
  folderColor = this.defaultFolderColor;
  folderDescription = '';
  searchTerm = '';
  isHeaderCollapsed = false;
  isFolderFormOpen = false;
  isSaving = false;
  isDeleting = false;
  pendingDelete: { id: string; name: string } | null = null;
  editingFolder: Folder | null = null;
  errorMessage = '';
  private longPressTimer?: ReturnType<typeof setTimeout>;
  private longPressTriggered = false;
  private longPressOrigin?: { x: number; y: number };

  openFolder(folderId: string) {
    return this.navService.goToFolderNotes(folderId);
  }

  handleFolderClick(folderId: string) {
    if (this.longPressTriggered) {
      this.longPressTriggered = false;
      return;
    }

    return this.openFolder(folderId);
  }

  startLongPress(event: PointerEvent, folder: Folder) {
    if (event.button !== 0) {
      return;
    }

    this.cancelLongPress();
    this.longPressTriggered = false;
    this.longPressOrigin = { x: event.clientX, y: event.clientY };
    this.longPressTimer = setTimeout(() => {
      this.longPressTriggered = true;
      this.longPressTimer = undefined;
      void this.openFolderOptions(folder);
      window.setTimeout(() => this.longPressTriggered = false, 1000);
    }, 550);
  }

  trackLongPress(event: PointerEvent) {
    if (!this.longPressOrigin) {
      return;
    }

    const distance = Math.hypot(
      event.clientX - this.longPressOrigin.x,
      event.clientY - this.longPressOrigin.y
    );

    if (distance > 10) {
      this.cancelLongPress();
    }
  }

  cancelLongPress() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = undefined;
    }
    this.longPressOrigin = undefined;
  }

  async openFolderOptions(folder: Folder) {
    this.cancelLongPress();
    const sheet = await this.actionSheetController.create({
      header: folder.name,
      buttons: [
        {
          text: 'Editar',
          icon: 'pencil-outline',
          handler: () => this.openEditFolder(folder)
        },
        {
          text: 'Eliminar',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => void this.deleteFolder(folder.id, folder.name)
        },
        { text: 'Cancelar', role: 'cancel' }
      ]
    });
    await sheet.present();
  }

  openSettings() {
    return this.navService.goToSettings();
  }

  async focusSearch() {
    this.folderSearch?.focus();
  }

  onSearchChange(term: string) {
    this.searchTerm = term;
    this.searchTerm$.next(term);
  }


  openCreateFolder() {
    this.editingFolder = null;
    this.folderName = '';
    this.folderColor = this.defaultFolderColor;
    this.folderDescription = '';
    this.isFolderFormOpen = true;
    this.errorMessage = '';
  }

  openEditFolder(folder: Folder) {
    this.editingFolder = folder;
    this.folderName = folder.name;
    this.folderColor = folder.color || this.defaultFolderColor;
    this.folderDescription = folder.description || '';
    this.isFolderFormOpen = true;
    this.errorMessage = '';
  }

  closeFolderForm() {
    this.isFolderFormOpen = false;
    this.editingFolder = null;
    this.folderName = '';
    this.folderColor = this.defaultFolderColor;
    this.folderDescription = '';
    this.errorMessage = '';
  }

  async saveFolder() {
    if (this.isSaving || !this.folderName.trim()) {
      return;
    }

    this.errorMessage = '';
    this.isSaving = true;

    try {
      if (this.editingFolder) {
        await this.folderService.rename(this.editingFolder.id, this.folderName, this.folderColor, this.folderDescription);
      } else {
        await this.folderService.create(this.folderName, this.folderColor, this.folderDescription);
      }
      this.closeFolderForm();
    } catch {
      this.errorMessage = 'Escribe un nombre válido para la carpeta.';
    } finally {
      this.isSaving = false;
    }
  }

  deleteFolder(folderId: string, name: string) {
    this.pendingDelete = { id: folderId, name };
  }

  cancelFolderDelete() {
    this.pendingDelete = null;
  }

  confirmFolderDelete() {
    const folder = this.pendingDelete;

    if (folder) {
      this.isDeleting = true;
      void this.performFolderDelete(folder.id);
    }
  }

  private async performFolderDelete(folderId: string) {
    try {
      await this.folderService.delete(folderId);
    } catch {
      this.errorMessage = 'No se pudo eliminar la carpeta.';
    } finally {
      this.isDeleting = false;
      this.pendingDelete = null;
    }
  }

  async logout() {
    await this.authService.logout();
    return this.navService.goToLogin('back');
  }
}
