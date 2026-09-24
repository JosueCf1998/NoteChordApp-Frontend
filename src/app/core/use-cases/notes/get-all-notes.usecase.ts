import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Note } from '../../models/note/note.model';
import { Result } from '../../models/result.model';
import { NoteRepository } from '../../repositories/note.repository';

@Injectable({ providedIn: 'root' })
export class GetAllNotesUseCase {
  private readonly noteRepository = inject(NoteRepository);

  execute(): Observable<Result<Note[]>> {
    return this.noteRepository.getAllNotes();
  }
}

