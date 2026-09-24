import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Folder } from '../../models/folder/folder.model';
import { Result } from '../../models/result.model';
import { FolderRepository } from '../../repositories/folder.repository';

@Injectable({ providedIn: 'root' })
export class GetFoldersUseCase {
  private readonly folderRepository = inject(FolderRepository);

  execute(): Observable<Result<Folder[]>> {
    return this.folderRepository.getFolders();
  }
}

