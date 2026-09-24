import { Injectable, inject } from '@angular/core';
import { Result } from '../../models/result.model';
import { FolderRepository } from '../../repositories/folder.repository';

export interface DeleteFolderRequest {
  id: string;
}

@Injectable({ providedIn: 'root' })
export class DeleteFolderUseCase {
  private readonly folderRepository = inject(FolderRepository);

  execute(request: DeleteFolderRequest): Promise<Result<void>> {
    return this.folderRepository.delete(request.id);
  }
}

