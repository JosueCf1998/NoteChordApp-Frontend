import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { Folder } from '../../../core/models/folder/folder.model';
import { FolderRepository } from '../../../core/repositories/folder.repository';

@Injectable({ providedIn: 'root' })
export class FolderService {
  private readonly folderRepository = inject(FolderRepository);

  readonly folders$: Observable<Folder[]> = this.folderRepository.getFolders().pipe(
    map((res) => res.data || [])
  );

  watch(folderId: string): Observable<Folder | null> {
    return this.folderRepository.getFolderById(folderId).pipe(
      map((res) => res.data ?? null)
    );
  }

  async create(name: string, color?: string, description?: string) {
    const res = await this.folderRepository.create(name, color, description);
    if (!res.success) {
      throw new Error(res.message);
    }
    return res.data;
  }

  async rename(folderId: string, name: string, color?: string, description?: string) {
    const res = await this.folderRepository.update(folderId, name, color, description);
    if (!res.success) {
      throw new Error(res.message);
    }
  }

  async delete(folderId: string): Promise<void> {
    const res = await this.folderRepository.delete(folderId);
    if (!res.success) {
      throw new Error(res.message);
    }
  }
}
