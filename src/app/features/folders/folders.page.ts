import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActionSheetController, IonicModule, ViewWillEnter } from '@ionic/angular';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { Folder } from '../../core/models/folder/folder.model';
import { NavigationService } from '../../core/navigation/navigation.service';
import { LocalManagementService } from '../../core/services/local-management.service';
import { SharedModule } from '../../shared/shared.module';
import {
  GetFoldersUseCase,
  CreateFolderUseCase,
  UpdateFolderUseCase,
  DeleteFolderUseCase
} from '../../core/use-cases/folders';
import { GetNotesCountByFolderUseCase } from '../../core/use-cases/notes';

@Component({
  selector: 'app-folders',
  templateUrl: 'folders.page.html',
  styleUrls: ['folders.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, SharedModule]
})
export class FoldersPage implements ViewWillEnter {
  private readonly authService = inject(AuthService);
  private readonly getFoldersUseCase = inject(GetFoldersUseCase);
  private readonly createFolderUseCase = inject(CreateFolderUseCase);
  private readonly updateFolderUseCase = inject(UpdateFolderUseCase);
  private readonly deleteFolderUseCase = inject(DeleteFolderUseCase);
  private readonly getNotesCountByFolderUseCase = inject(GetNotesCountByFolderUseCase);
  private readonly navService = inject(NavigationService);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly localService = inject(LocalManagementService);

  private readonly defaultFolderColor = '#3164F4';
  private readonly foldersStorageKey = 'notechord_folders_data';
  private readonly foldersLoadedKey = 'notechord_folders_loaded';
  private readonly noteCountsStorageKey = 'notechord_note_counts_data';

  // Valor booleano que se pone en true cuando ya llamó al servicio de listado
  isFoldersLoaded = this.localService.getVariable(this.foldersLoadedKey) === 'true';

  private readonly foldersSubject = new BehaviorSubject<Folder[]>(this.getInitialFoldersFromLocal());
  readonly folders$: Observable<Folder[]> = this.foldersSubject.asObservable();

  private readonly noteCountsSubject = new BehaviorSubject<Record<string, number>>(this.getInitialCountsFromLocal());
  readonly noteCounts$: Observable<Record<string, number>> = this.noteCountsSubject.asObservable();

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

  constructor() {
    this.loadFolders();
  }

  ionViewWillEnter() {
    this.loadFolders();
  }

  loadFolders() {
    // Cuando este sea true ya no debe llamar al servicio de listado sino saltarlo
    if (this.isFoldersLoaded) {
      return;
    }

    // Primera vez (es false): llama al servicio de listado y guarda el dato
    this.getFoldersUseCase.execute().subscribe((res) => {
      if (res.success && res.data) {
        this.isFoldersLoaded = true;
        this.localService.setVariable(this.foldersLoadedKey, 'true');
        this.localService.setVariable(this.foldersStorageKey, JSON.stringify(res.data));
        this.foldersSubject.next(res.data);
      }
    });

    this.getNotesCountByFolderUseCase.execute().subscribe((res) => {
      if (res.success && res.data) {
        this.localService.setVariable(this.noteCountsStorageKey, JSON.stringify(res.data));
        this.noteCountsSubject.next(res.data);
      }
    });
  }

  trackByFolderId(_index: number, folder: Folder): string {
    return folder.id;
  }

  private getInitialFoldersFromLocal(): Folder[] {
    const raw = this.localService.getVariable(this.foldersStorageKey);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private getInitialCountsFromLocal(): Record<string, number> {
    const raw = this.localService.getVariable(this.noteCountsStorageKey);
    if (!raw) {
      return {};
    }
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  private saveFoldersToLocal(folders: Folder[]) {
    this.localService.setVariable(this.foldersStorageKey, JSON.stringify(folders));
    this.foldersSubject.next(folders);
  }

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
    return this.navService.push(['/notes-list', folderId]);
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
      window.setTimeout(() => (this.longPressTriggered = false), 1000);
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
    return this.navService.push('/settings');
  }

  openSearch() {
    return this.navService.push('/search');
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
        const result = await this.updateFolderUseCase.execute({
          id: this.editingFolder.id,
          name: this.folderName,
          color: this.folderColor,
          description: this.folderDescription
        });
        if (!result.success) {
          this.errorMessage = result.message || 'No se pudo actualizar la carpeta.';
          return;
        }

        const updated = this.foldersSubject.getValue().map((f) =>
          f.id === this.editingFolder!.id
            ? { ...f, name: this.folderName, color: this.folderColor, description: this.folderDescription }
            : f
        ).sort((a, b) => a.name.localeCompare(b.name));
        this.saveFoldersToLocal(updated);
      } else {
        const result = await this.createFolderUseCase.execute({
          name: this.folderName,
          color: this.folderColor,
          description: this.folderDescription
        });
        if (!result.success) {
          this.errorMessage = result.message || 'No se pudo crear la carpeta.';
          return;
        }

        if (result.data) {
          const updated = [...this.foldersSubject.getValue(), result.data].sort((a, b) => a.name.localeCompare(b.name));
          this.saveFoldersToLocal(updated);
        }
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
      const result = await this.deleteFolderUseCase.execute({ id: folderId });
      if (!result.success) {
        this.errorMessage = result.message || 'No se pudo eliminar la carpeta.';
      } else {
        const updated = this.foldersSubject.getValue().filter((f) => f.id !== folderId);
        this.saveFoldersToLocal(updated);
      }
    } catch {
      this.errorMessage = 'No se pudo eliminar la carpeta.';
    } finally {
      this.isDeleting = false;
      this.pendingDelete = null;
    }
  }

  async logout() {
    this.localService.removeVariable(this.foldersStorageKey);
    this.localService.removeVariable(this.foldersLoadedKey);
    this.localService.removeVariable(this.noteCountsStorageKey);
    this.isFoldersLoaded = false;
    await this.authService.logout();
    return this.navService.replace('/login', undefined, true, 'back');
  }
}
