import { Injectable } from '@angular/core';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { firebaseAuth } from '../firebase/firebase';
import { UserSession } from './user-session.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = firebaseAuth;
  private readonly sessionStorageKey = 'notechord_user_session';

  private readonly sessionSubject = new BehaviorSubject<UserSession | null>(this.readInitialSession());
  readonly session$ = this.sessionSubject.asObservable();

  private readonly userSubject = new BehaviorSubject<User | null>(this.auth?.currentUser ?? null);
  readonly user$: Observable<User | null> = this.userSubject.asObservable();

  constructor() {
    if (this.auth) {
      onAuthStateChanged(this.auth, (user) => {
        if (user) {
          this.saveSession(user);
        }
        this.userSubject.next(user);
      });
    }
  }

  get currentUser(): User | null {
    return this.auth?.currentUser ?? null;
  }

  get currentUserId(): string | null {
    return this.auth?.currentUser?.uid ?? this.getSession()?.uid ?? null;
  }

  getSession(): UserSession | null {
    try {
      const raw = localStorage.getItem(this.sessionStorageKey);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && typeof parsed.uid === 'string') {
        return parsed as UserSession;
      }
      this.clearSession();
      return null;
    } catch {
      this.clearSession();
      return null;
    }
  }

  hasSession(): boolean {
    return this.getSession() !== null;
  }

  isLoggedIn(): boolean {
    return Boolean(this.currentUser || this.hasSession());
  }

  saveSession(user: Partial<UserSession> | User): UserSession {
    const session: UserSession = {
      uid: user.uid as string,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      emailVerified: Boolean(user.emailVerified),
      phoneNumber: (user as any).phoneNumber ?? null,
      lastLoginAt: Date.now()
    };

    try {
      localStorage.setItem(this.sessionStorageKey, JSON.stringify(session));
    } catch { }

    this.sessionSubject.next(session);
    return session;
  }

  clearSession(): void {
    try {
      localStorage.removeItem(this.sessionStorageKey);
    } catch { }
    this.sessionSubject.next(null);
  }

  async validateSession(): Promise<boolean> {
    if (this.auth) {
      try {
        if (typeof this.auth.authStateReady === 'function') {
          await Promise.race([
            this.auth.authStateReady(),
            new Promise<void>((resolve) => window.setTimeout(resolve, 2000))
          ]);
        }
      } catch { }
    }

    if (this.auth?.currentUser) {
      this.saveSession(this.auth.currentUser);
      return true;
    }

    const storedSession = this.getSession();
    if (storedSession) {
      return true;
    }

    return false;
  }

  async login(email: string, password: string) {
    const auth = this.auth;

    if (!auth) {
      throw new Error('Firebase no esta configurado');
    }

    await this.setPersistenceWithFallback(auth);
    const credential = await signInWithEmailAndPassword(auth, email, password);
    if (credential.user) {
      this.saveSession(credential.user);
    }
    return credential;
  }

  async register(email: string, password: string) {
    const auth = this.auth;

    if (!auth) {
      throw new Error('Firebase no esta configurado');
    }

    await this.setPersistenceWithFallback(auth);
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (credential.user) {
      this.saveSession(credential.user);
    }
    return credential;
  }

  resetPassword(email: string) {
    return this.auth
      ? sendPasswordResetEmail(this.auth, email)
      : Promise.reject(new Error('Firebase no esta configurado'));
  }

  async logout(): Promise<void> {
    this.clearSession();
    this.userSubject.next(null);
    if (this.auth) {
      await signOut(this.auth);
    }
  }

  private readInitialSession(): UserSession | null {
    try {
      const raw = localStorage.getItem(this.sessionStorageKey);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && typeof parsed.uid === 'string') {
        return parsed as UserSession;
      }
      return null;
    } catch {
      return null;
    }
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
