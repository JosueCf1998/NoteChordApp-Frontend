import { Injectable, inject } from '@angular/core';
import { Result } from '../../models/result.model';
import { NoteRepository } from '../../repositories/note.repository';

export interface UpdateNoteParams {
  id: string;
  title: string;
  content: string;
}

@Injectable({ providedIn: 'root' })
export class UpdateNoteUseCase {
  private readonly noteRepository = inject(NoteRepository);

  execute(params: UpdateNoteParams): Promise<Result<void>> {
    return this.noteRepository.update(params.id, params.title, params.content);
  }
}

