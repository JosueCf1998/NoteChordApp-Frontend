import { Injectable, inject } from '@angular/core';
import { Folder } from '../../models/folder/folder.model';
import { Result } from '../../models/result.model';
import { FolderRepository } from '../../repositories/folder.repository';

export interface CreateFolderRequest {
  name: string;
  color?: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class CreateFolderUseCase {
  private readonly folderRepository = inject(FolderRepository);

  execute(request: CreateFolderRequest): Promise<Result<Folder>> {
    return this.folderRepository.create(request.name, request.color, request.description);
  }
}

