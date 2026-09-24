import { Injectable, inject } from '@angular/core';
import { Note } from '../../models/note/note.model';
import { Result } from '../../models/result.model';
import { NoteRepository } from '../../repositories/note.repository';

export interface CreateNoteParams {
  folderId: string;
  title: string;
  content?: string;
}

@Injectable({ providedIn: 'root' })
export class CreateNoteUseCase {
  private readonly noteRepository = inject(NoteRepository);

  execute(params: CreateNoteParams): Promise<Result<Note>> {
    return this.noteRepository.create(params.folderId, params.title, params.content ?? '');
  }
}

