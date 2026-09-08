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
import { Observable, map, of, shareReplay, switchMap } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { firebaseFirestore } from '../../../core/firebase/firebase';
import { Note } from '../models/note.model';

@Injectable({ providedIn: 'root' })
export class NoteService {
  private readonly firestore = firebaseFirestore;

  readonly countsByFolder$ = this.authService.user$.pipe(
    switchMap((user) => {
      if (!user || !this.firestore) {
        return of([] as Note[]);
      }

      const notesQuery = query(
        collection(this.firestore, 'notes'),
        where('userId', '==', user.uid)
      );

      return new Observable<Note[]>((subscriber) => onSnapshot(
        notesQuery,
        (snapshot) => subscriber.next(snapshot.docs.map((note) => ({
          id: note.id,
          ...note.data()
        } as Note))),
        (error) => subscriber.error(error)
      ));
    }),
    map((notes) => notes.reduce<Record<string, number>>((counts, note) => {
      counts[note.folderId] = (counts[note.folderId] ?? 0) + 1;
      return counts;
    }, {})),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor(private readonly authService: AuthService) {}

  forFolder(folderId: string): Observable<Note[]> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (!user || !this.firestore || !folderId) {
          return of([]);
        }

        const notesQuery = query(
          collection(this.firestore, 'notes'),
          where('userId', '==', user.uid),
          where('folderId', '==', folderId)
        );

        return new Observable<Note[]>((subscriber) => onSnapshot(
          notesQuery,
          (snapshot) => subscriber.next(snapshot.docs
            .map((note) => ({
              id: note.id,
              ...note.data()
            } as Note))
            .sort((first, second) => first.title.localeCompare(second.title))),
          (error) => subscriber.error(error)
        ));
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  async deleteByFolder(folderId: string): Promise<void> {
    const user = this.authService.currentUser;
    if (!this.firestore || !user || !folderId) {
      return;
    }

    const notesQuery = query(
      collection(this.firestore, 'notes'),
      where('userId', '==', user.uid),
      where('folderId', '==', folderId)
    );

    const snapshot = await getDocs(notesQuery);
    if (snapshot.empty) {
      return;
    }

    const batch = writeBatch(this.firestore);
    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  }

  create(folderId: string, title: string, content = '') {
    const user = this.authService.currentUser;
    const normalizedTitle = title.trim();

    if (!user || !this.firestore || !folderId || !normalizedTitle) {
      return Promise.reject(new Error('El título de la nota es obligatorio'));
    }

    return addDoc(collection(this.firestore, 'notes'), {
      userId: user.uid,
      folderId,
      title: normalizedTitle,
      content,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  delete(noteId: string) {
    if (!this.firestore) {
      return Promise.reject(new Error('Firestore no esta configurado'));
    }

    return deleteDoc(doc(this.firestore, 'notes', noteId));
  }

  watch(noteId: string): Observable<Note | null> {
    if (!this.firestore || !noteId) {
      return of(null);
    }

    return new Observable<Note | null>((subscriber) => onSnapshot(
      doc(this.firestore!, 'notes', noteId),
      (snapshot) => subscriber.next(snapshot.exists() ? {
        id: snapshot.id,
        ...snapshot.data()
      } as Note : null),
      (error) => subscriber.error(error)
    ));
  }

  update(noteId: string, title: string, content: string) {
    const normalizedTitle = title.trim();

    if (!this.firestore || !noteId || !normalizedTitle) {
      return Promise.reject(new Error('El título de la nota es obligatorio'));
    }

    return updateDoc(doc(this.firestore, 'notes', noteId), {
      title: normalizedTitle,
      content,
      updatedAt: serverTimestamp()
    });
  }

}
