import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { Observable, of, switchMap } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { ENDPOINTS } from '../constants/endpoints';
import { firebaseFirestore } from '../firebase/firebase';
import { Folder } from '../models/folder/folder.model';
import {
  createFailureResult,
  createSuccessResult,
  Result
} from '../models/result.model';
import { FolderRepository } from './folder.repository';

@Injectable({ providedIn: 'root' })
export class FirestoreFolderRepository extends FolderRepository {
  private readonly firestore = firebaseFirestore;

  constructor(private readonly authService: AuthService) {
    super();
  }

  getFolders(): Observable<Result<Folder[]>> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (!user) {
          return of(createSuccessResult<Folder[]>([], 'Usuario no autenticado'));
        }

        if (!this.firestore) {
          return of(createFailureResult<Folder[]>('Firestore no está inicializado'));
        }

        const foldersQuery = query(
          collection(this.firestore, ENDPOINTS.FOLDERS.COLLECTION),
          where('userId', '==', user.uid)
        );

        return new Observable<Result<Folder[]>>((subscriber) => {
          const unsubscribe = onSnapshot(
            foldersQuery,
            (snapshot) => {
              const folders = snapshot.docs
                .map((d) => ({
                  id: d.id,
                  ...d.data()
                } as Folder))
                .sort((a, b) => a.name.localeCompare(b.name));

              subscriber.next(createSuccessResult(folders));
            },
            (error) => {
              subscriber.next(
                createFailureResult<Folder[]>(
                  'Error al escuchar carpetas',
                  { code: 'FIRESTORE_SNAPSHOT_ERROR', message: error.message }
                )
              );
            }
          );

          return () => unsubscribe();
        });
      })
    );
  }

  getFolderById(id: string): Observable<Result<Folder | null>> {
    if (!this.firestore || !id) {
      return of(createSuccessResult<Folder | null>(null));
    }

    return new Observable<Result<Folder | null>>((subscriber) => {
      const unsubscribe = onSnapshot(
        doc(this.firestore!, ENDPOINTS.FOLDERS.COLLECTION, id),
        (snapshot) => {
          if (snapshot.exists()) {
            subscriber.next(
              createSuccessResult<Folder | null>({
                id: snapshot.id,
                ...snapshot.data()
              } as Folder)
            );
          } else {
            subscriber.next(createSuccessResult<Folder | null>(null));
          }
        },
        (error) => {
          subscriber.next(
            createFailureResult<Folder | null>(
              'Error al consultar carpeta',
              { code: 'FIRESTORE_GET_ERROR', message: error.message }
            )
          );
        }
      );

      return () => unsubscribe();
    });
  }

  async create(name: string, color?: string, description?: string): Promise<Result<Folder>> {
    const user = this.authService.currentUser;
    const normalizedName = name.trim();

    if (!user) {
      return createFailureResult<Folder>('Usuario no autenticado', {
        code: 'AUTH_REQUIRED',
        message: 'Debes iniciar sesión para crear carpetas'
      });
    }

    if (!normalizedName) {
      return createFailureResult<Folder>('El nombre de la carpeta es obligatorio', {
        code: 'VALIDATION_ERROR',
        message: 'El nombre de la carpeta no puede estar vacío'
      });
    }

    if (!this.firestore) {
      return createFailureResult<Folder>('Firestore no está disponible');
    }

    try {
      const docData = {
        userId: user.uid,
        name: normalizedName,
        color: color || '#3164F4',
        description: description?.trim() || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(
        collection(this.firestore, ENDPOINTS.FOLDERS.COLLECTION),
        docData
      );

      const createdFolder: Folder = {
        id: docRef.id,
        ...docData
      } as unknown as Folder;

      return createSuccessResult(createdFolder, 'Carpeta creada correctamente');
    } catch (error: any) {
      return createFailureResult<Folder>('Error al crear la carpeta', {
        code: 'FIRESTORE_CREATE_ERROR',
        message: error?.message || 'Error desconocido'
      });
    }
  }

  async update(id: string, name: string, color?: string, description?: string): Promise<Result<void>> {
    const normalizedName = name.trim();

    if (!id || !normalizedName) {
      return createFailureResult<void>('El ID y el nombre son obligatorios', {
        code: 'VALIDATION_ERROR',
        message: 'Datos de carpeta incompletos'
      });
    }

    if (!this.firestore) {
      return createFailureResult<void>('Firestore no está disponible');
    }

    try {
      await updateDoc(doc(this.firestore, ENDPOINTS.FOLDERS.COLLECTION, id), {
        name: normalizedName,
        ...(color !== undefined ? { color } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
        updatedAt: serverTimestamp()
      });

      return createSuccessResult(undefined, 'Carpeta actualizada correctamente');
    } catch (error: any) {
      return createFailureResult<void>('Error al actualizar la carpeta', {
        code: 'FIRESTORE_UPDATE_ERROR',
        message: error?.message || 'Error desconocido'
      });
    }
  }

  async delete(id: string): Promise<Result<void>> {
    if (!id) {
      return createFailureResult<void>('ID de carpeta no válido');
    }

    if (!this.firestore) {
      return createFailureResult<void>('Firestore no está disponible');
    }

    try {
      // Eliminar notas contenidas en la carpeta en lote
      const notesQuery = query(
        collection(this.firestore, ENDPOINTS.NOTES.COLLECTION),
        where('folderId', '==', id)
      );

      const snapshot = await getDocs(notesQuery);
      const batch = writeBatch(this.firestore);

      snapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      batch.delete(doc(this.firestore, ENDPOINTS.FOLDERS.COLLECTION, id));
      await batch.commit();

      return createSuccessResult(undefined, 'Carpeta eliminada correctamente');
    } catch (error: any) {
      return createFailureResult<void>('Error al eliminar la carpeta', {
        code: 'FIRESTORE_DELETE_ERROR',
        message: error?.message || 'Error desconocido'
      });
    }
  }
}

