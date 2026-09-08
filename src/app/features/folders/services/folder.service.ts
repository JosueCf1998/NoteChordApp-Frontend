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

import { AuthService } from '../../../core/auth/auth.service';
import { firebaseFirestore } from '../../../core/firebase/firebase';
import { Folder } from '../models/folder.model';

@Injectable({ providedIn: 'root' })
export class FolderService {
  private readonly firestore = firebaseFirestore;

  readonly folders$: Observable<Folder[]> = this.authService.user$.pipe(
    switchMap((user) => {
      if (!user || !this.firestore) {
        return of([]);
      }

      const foldersQuery = query(
        collection(this.firestore, 'folders'),
        where('userId', '==', user.uid)
      );

      return new Observable<Folder[]>((subscriber) => onSnapshot(
        foldersQuery,
        (snapshot) => subscriber.next(snapshot.docs
          .map((folder) => ({
            id: folder.id,
            ...folder.data()
          } as Folder))
          .sort((first, second) => first.name.localeCompare(second.name))),
        (error) => subscriber.error(error)
      ));
    })
  );

  constructor(private readonly authService: AuthService) {}

  watch(folderId: string): Observable<Folder | null> {
    if (!this.firestore || !folderId) {
      return of(null);
    }

    return new Observable<Folder | null>((subscriber) => onSnapshot(
      doc(this.firestore!, 'folders', folderId),
      (snapshot) => subscriber.next(snapshot.exists() ? {
        id: snapshot.id,
        ...snapshot.data()
      } as Folder : null),
      (error) => subscriber.error(error)
    ));
  }

  create(name: string, color?: string, description?: string) {
    const user = this.authService.currentUser;
    const normalizedName = name.trim();

    if (!user || !this.firestore || !normalizedName) {
      return Promise.reject(new Error('No se puede crear la carpeta'));
    }

    return addDoc(collection(this.firestore, 'folders'), {
      userId: user.uid,
      name: normalizedName,
      color: color || '#3164F4',
      description: description?.trim() || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  rename(folderId: string, name: string, color?: string, description?: string) {
    const normalizedName = name.trim();

    if (!this.firestore || !normalizedName) {
      return Promise.reject(new Error('El nombre de la carpeta es obligatorio'));
    }

    return updateDoc(doc(this.firestore, 'folders', folderId), {
      name: normalizedName,
      ...(color !== undefined ? { color } : {}),
      ...(description !== undefined ? { description: description.trim() } : {}),
      updatedAt: serverTimestamp()
    });
  }

  async delete(folderId: string): Promise<void> {
    if (!this.firestore) {
      throw new Error('Firestore no esta configurado');
    }

    const notesQuery = query(
      collection(this.firestore, 'notes'),
      where('folderId', '==', folderId)
    );

    const snapshot = await getDocs(notesQuery);
    const batch = writeBatch(this.firestore);

    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    batch.delete(doc(this.firestore, 'folders', folderId));
    await batch.commit();
  }

}
