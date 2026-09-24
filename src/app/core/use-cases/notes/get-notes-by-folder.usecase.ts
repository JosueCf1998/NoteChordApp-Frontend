import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Note } from '../../models/note/note.model';
import { Result } from '../../models/result.model';
import { NoteRepository } from '../../repositories/note.repository';

@Injectable({ providedIn: 'root' })
export class GetNotesByFolderUseCase {
  private readonly noteRepository = inject(NoteRepository);

  execute(folderId: string): Observable<Result<Note[]>> {
    return this.noteRepository.getNotesByFolder(folderId);
  }
}

