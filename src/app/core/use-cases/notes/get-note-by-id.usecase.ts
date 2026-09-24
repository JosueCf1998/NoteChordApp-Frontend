import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Note } from '../../models/note/note.model';
import { Result } from '../../models/result.model';
import { NoteRepository } from '../../repositories/note.repository';

@Injectable({ providedIn: 'root' })
export class GetNoteByIdUseCase {
  private readonly noteRepository = inject(NoteRepository);

  execute(id: string): Observable<Result<Note | null>> {
    return this.noteRepository.getNoteById(id);
  }
}

