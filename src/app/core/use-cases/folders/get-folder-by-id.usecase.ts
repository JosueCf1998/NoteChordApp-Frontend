import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Folder } from '../../models/folder/folder.model';
import { Result } from '../../models/result.model';
import { FolderRepository } from '../../repositories/folder.repository';

export interface GetFolderByIdRequest {
  id: string;
}

@Injectable({ providedIn: 'root' })
export class GetFolderByIdUseCase {
  private readonly folderRepository = inject(FolderRepository);

  execute(request: GetFolderByIdRequest): Observable<Result<Folder | null>> {
    return this.folderRepository.getFolderById(request.id);
  }
}

