import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Result } from '../../models/result.model';
import { NoteRepository } from '../../repositories/note.repository';

@Injectable({ providedIn: 'root' })
export class GetNotesCountByFolderUseCase {
  private readonly noteRepository = inject(NoteRepository);

  execute(): Observable<Result<Record<string, number>>> {
    return this.noteRepository.getCountsByFolder();
  }
}

