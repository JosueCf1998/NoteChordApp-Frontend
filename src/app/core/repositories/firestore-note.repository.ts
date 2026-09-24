import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { Observable, of, switchMap, map } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { ENDPOINTS } from '../constants/endpoints';
import { firebaseFirestore } from '../firebase/firebase';
import { Note } from '../models/note/note.model';
import {
  createFailureResult,
  createSuccessResult,
  Result
} from '../models/result.model';
import { NoteRepository } from './note.repository';

@Injectable({ providedIn: 'root' })
export class FirestoreNoteRepository extends NoteRepository {
  private readonly firestore = firebaseFirestore;

  constructor(private readonly authService: AuthService) {
    super();
  }

  getAllNotes(): Observable<Result<Note[]>> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (!user) {
          return of(createSuccessResult<Note[]>([], 'Usuario no autenticado'));
        }

        if (!this.firestore) {
          return of(createFailureResult<Note[]>('Firestore no está inicializado'));
        }

        const notesQuery = query(
          collection(this.firestore, ENDPOINTS.NOTES.COLLECTION),
          where('userId', '==', user.uid)
        );

        return new Observable<Result<Note[]>>((subscriber) => {
          const unsubscribe = onSnapshot(
            notesQuery,
            (snapshot) => {
              const notes = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data()
              } as Note));
              subscriber.next(createSuccessResult(notes));
            },
            (error) => {
              subscriber.next(
                createFailureResult<Note[]>('Error al escuchar notas', {
                  code: 'FIRESTORE_SNAPSHOT_ERROR',
                  message: error.message
                })
              );
            }
          );

          return () => unsubscribe();
        });
      })
    );
  }

  getNotesByFolder(folderId: string): Observable<Result<Note[]>> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (!user || !folderId) {
          return of(createSuccessResult<Note[]>([]));
        }

        if (!this.firestore) {
          return of(createFailureResult<Note[]>('Firestore no está inicializado'));
        }

        const notesQuery = query(
          collection(this.firestore, ENDPOINTS.NOTES.COLLECTION),
          where('userId', '==', user.uid),
          where('folderId', '==', folderId)
        );

        return new Observable<Result<Note[]>>((subscriber) => {
          const unsubscribe = onSnapshot(
            notesQuery,
            (snapshot) => {
              const notes = snapshot.docs
                .map((d) => ({
                  id: d.id,
                  ...d.data()
                } as Note))
                .sort((first, second) => first.title.localeCompare(second.title));

              subscriber.next(createSuccessResult(notes));
            },
            (error) => {
              subscriber.next(
                createFailureResult<Note[]>('Error al escuchar notas de la carpeta', {
                  code: 'FIRESTORE_SNAPSHOT_ERROR',
                  message: error.message
                })
              );
            }
          );

          return () => unsubscribe();
        });
      })
    );
  }

  getNoteById(id: string): Observable<Result<Note | null>> {
    if (!this.firestore || !id) {
      return of(createSuccessResult<Note | null>(null));
    }

    return new Observable<Result<Note | null>>((subscriber) => {
      const unsubscribe = onSnapshot(
        doc(this.firestore!, ENDPOINTS.NOTES.COLLECTION, id),
        (snapshot) => {
          if (snapshot.exists()) {
            subscriber.next(
              createSuccessResult<Note | null>({
                id: snapshot.id,
                ...snapshot.data()
              } as Note)
            );
          } else {
            subscriber.next(createSuccessResult<Note | null>(null));
          }
        },
        (error) => {
          subscriber.next(
            createFailureResult<Note | null>('Error al consultar nota', {
              code: 'FIRESTORE_GET_ERROR',
              message: error.message
            })
          );
        }
      );

      return () => unsubscribe();
    });
  }

  getCountsByFolder(): Observable<Result<Record<string, number>>> {
    return this.getAllNotes().pipe(
      map((res) => {
        if (!res.success || !res.data) {
          return createSuccessResult<Record<string, number>>({});
        }

        const counts = res.data.reduce<Record<string, number>>((acc, note) => {
          acc[note.folderId] = (acc[note.folderId] ?? 0) + 1;
          return acc;
        }, {});

        return createSuccessResult(counts);
      })
    );
  }

  async create(folderId: string, title: string, content = ''): Promise<Result<Note>> {
    const user = this.authService.currentUser;
    const normalizedTitle = title.trim();

    if (!user) {
      return createFailureResult<Note>('Usuario no autenticado', {
        code: 'AUTH_REQUIRED',
        message: 'Debes iniciar sesión para crear notas'
      });
    }

    if (!folderId || !normalizedTitle) {
      return createFailureResult<Note>('El título de la nota es obligatorio', {
        code: 'VALIDATION_ERROR',
        message: 'El ID de carpeta y el título son obligatorios'
      });
    }

    if (!this.firestore) {
      return createFailureResult<Note>('Firestore no está disponible');
    }

    try {
      const docData = {
        userId: user.uid,
        folderId,
        title: normalizedTitle,
        content,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(
        collection(this.firestore, ENDPOINTS.NOTES.COLLECTION),
        docData
      );

      const createdNote: Note = {
        id: docRef.id,
        ...docData
      } as unknown as Note;

      return createSuccessResult(createdNote, 'Nota creada correctamente');
    } catch (error: any) {
      return createFailureResult<Note>('Error al crear la nota', {
        code: 'FIRESTORE_CREATE_ERROR',
        message: error?.message || 'Error desconocido'
      });
    }
  }

  async update(id: string, title: string, content: string): Promise<Result<void>> {
    const normalizedTitle = title.trim();

    if (!id || !normalizedTitle) {
      return createFailureResult<void>('El ID y el título son obligatorios', {
        code: 'VALIDATION_ERROR',
        message: 'Datos de la nota incompletos'
      });
    }

    if (!this.firestore) {
      return createFailureResult<void>('Firestore no está disponible');
    }

    try {
      await updateDoc(doc(this.firestore, ENDPOINTS.NOTES.COLLECTION, id), {
        title: normalizedTitle,
        content,
        updatedAt: serverTimestamp()
      });

      return createSuccessResult(undefined, 'Nota actualizada correctamente');
    } catch (error: any) {
      return createFailureResult<void>('Error al actualizar la nota', {
        code: 'FIRESTORE_UPDATE_ERROR',
        message: error?.message || 'Error desconocido'
      });
    }
  }

  async delete(id: string): Promise<Result<void>> {
    if (!id) {
      return createFailureResult<void>('ID de nota no válido');
    }

    if (!this.firestore) {
      return createFailureResult<void>('Firestore no está disponible');
    }

    try {
      await deleteDoc(doc(this.firestore, ENDPOINTS.NOTES.COLLECTION, id));
      return createSuccessResult(undefined, 'Nota eliminada correctamente');
    } catch (error: any) {
      return createFailureResult<void>('Error al eliminar la nota', {
        code: 'FIRESTORE_DELETE_ERROR',
        message: error?.message || 'Error desconocido'
      });
    }
  }
}

