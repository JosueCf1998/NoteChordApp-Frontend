import { Observable } from 'rxjs';
import { Folder } from '../models/folder/folder.model';
import { Result } from '../models/result.model';

export abstract class FolderRepository {
  abstract getFolders(): Observable<Result<Folder[]>>;
  abstract getFolderById(id: string): Observable<Result<Folder | null>>;
  abstract create(name: string, color?: string, description?: string): Promise<Result<Folder>>;
  abstract update(id: string, name: string, color?: string, description?: string): Promise<Result<void>>;
  abstract delete(id: string): Promise<Result<void>>;
}

