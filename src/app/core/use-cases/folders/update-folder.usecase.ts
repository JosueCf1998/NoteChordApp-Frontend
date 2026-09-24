import { Injectable, inject } from '@angular/core';
import { Result } from '../../models/result.model';
import { FolderRepository } from '../../repositories/folder.repository';

export interface UpdateFolderRequest {
  id: string;
  name: string;
  color?: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class UpdateFolderUseCase {
  private readonly folderRepository = inject(FolderRepository);

  execute(request: UpdateFolderRequest): Promise<Result<void>> {
    return this.folderRepository.update(
      request.id,
      request.name,
      request.color,
      request.description
    );
  }
}

