import { Injectable, inject } from '@angular/core';
import { Result } from '../../models/result.model';
import { NoteRepository } from '../../repositories/note.repository';

export interface DeleteNoteParams {
  id: string;
}

@Injectable({ providedIn: 'root' })
export class DeleteNoteUseCase {
  private readonly noteRepository = inject(NoteRepository);

  execute(params: DeleteNoteParams): Promise<Result<void>> {
    return this.noteRepository.delete(params.id);
  }
}

