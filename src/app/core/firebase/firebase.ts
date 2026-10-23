import { Capacitor } from '@capacitor/core';
import { initializeApp } from 'firebase/app';
import {
  Auth,
  browserLocalPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth
} from 'firebase/auth';
import {
  Firestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  persistentSingleTabManager,
  memoryLocalCache
} from 'firebase/firestore';

import { environment } from '../../../environments/environment';

const firebaseApp = environment.firebase.apiKey && environment.firebase.projectId
  ? initializeApp(environment.firebase)
  : null;

function createAuth(): Auth | null {
  if (!firebaseApp) {
    return null;
  }

  try {
    if (Capacitor.isNativePlatform()) {
      return initializeAuth(firebaseApp, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence]
      });
    }
    return getAuth(firebaseApp);
  } catch (error) {
    console.warn('Fallback to getAuth due to initializeAuth error:', error);
    try {
      return getAuth(firebaseApp);
    } catch {
      return null;
    }
  }
}

export const firebaseAuth: Auth | null = createAuth();

function createFirestore(): Firestore | null {
  if (!firebaseApp) {
    return null;
  }

  try {
    // En plataformas nativas (iOS/Android Capacitor), persistentMultipleTabManager
    // cuelga los Web Locks de Safari/WebKit y bloquea todas las consultas.
    // Se debe usar persistentSingleTabManager.
    const tabManager = Capacitor.isNativePlatform()
      ? persistentSingleTabManager(undefined)
      : persistentMultipleTabManager();

    return initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({
        tabManager
      })
    });
  } catch (error) {
    console.warn('Fallback to memoryLocalCache for Firestore due to error:', error);
    try {
      return initializeFirestore(firebaseApp, {
        localCache: memoryLocalCache()
      });
    } catch {
      return null;
    }
  }
}

export const firebaseFirestore: Firestore | null = createFirestore();

