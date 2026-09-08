import { Injectable } from '@angular/core';
import { browserLocalPersistence, createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { Observable, shareReplay } from 'rxjs';

import { firebaseAuth } from '../firebase/firebase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = firebaseAuth;

  readonly user$ = new Observable<User | null>((subscriber) => {
    if (!this.auth) {
      subscriber.next(null);
      subscriber.complete();
      return;
    }

    return onAuthStateChanged(this.auth, subscriber);
  }).pipe(
    shareReplay({ bufferSize: 1, refCount: true })
  );

  get currentUser() {
    return this.auth?.currentUser ?? null;
  }

  login(email: string, password: string) {
    const auth = this.auth;

    if (!auth) {
      return Promise.reject(new Error('Firebase no esta configurado'));
    }

    return this.setPersistenceWithFallback(auth)
      .then(() => signInWithEmailAndPassword(auth, email, password));
  }

  register(email: string, password: string) {
    const auth = this.auth;

    if (!auth) {
      return Promise.reject(new Error('Firebase no esta configurado'));
    }

    return this.setPersistenceWithFallback(auth)
      .then(() => createUserWithEmailAndPassword(auth, email, password));
  }

  resetPassword(email: string) {
    return this.auth
      ? sendPasswordResetEmail(this.auth, email)
      : Promise.reject(new Error('Firebase no esta configurado'));
  }

  logout() {
    return this.auth ? signOut(this.auth) : Promise.resolve();
  }

  private async setPersistenceWithFallback(auth: NonNullable<typeof this.auth>) {
    if (Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await Promise.race([
        setPersistence(auth, browserLocalPersistence),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('PERSISTENCE_TIMEOUT')), 3000);
        })
      ]);
    } catch { }
  }

}
