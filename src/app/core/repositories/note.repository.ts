import { Observable } from 'rxjs';
import { Note } from '../models/note/note.model';
import { Result } from '../models/result.model';

export abstract class NoteRepository {
  abstract getAllNotes(): Observable<Result<Note[]>>;
  abstract getNotesByFolder(folderId: string): Observable<Result<Note[]>>;
  abstract getNoteById(id: string): Observable<Result<Note | null>>;
  abstract getCountsByFolder(): Observable<Result<Record<string, number>>>;
  abstract create(folderId: string, title: string, content: string): Promise<Result<Note>>;
  abstract update(id: string, title: string, content: string): Promise<Result<void>>;
  abstract delete(id: string): Promise<Result<void>>;
}

