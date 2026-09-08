import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  const storageKey = 'notechord_user_session';

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should save session to localStorage and update session$', () => {
    const mockUser = {
      uid: 'user_123',
      email: 'test@notechord.app',
      displayName: 'Test User',
      photoURL: null,
      emailVerified: true
    };

    let emittedSession: any = null;
    service.session$.subscribe((session) => {
      emittedSession = session;
    });

    const saved = service.saveSession(mockUser);
    expect(saved.uid).toBe('user_123');
    expect(saved.email).toBe('test@notechord.app');
    expect(saved.lastLoginAt).toBeGreaterThan(0);

    const storedRaw = localStorage.getItem(storageKey);
    expect(storedRaw).toBeTruthy();
    expect(JSON.parse(storedRaw!).uid).toBe('user_123');
    expect(service.hasSession()).toBe(true);
    expect(service.isLoggedIn()).toBe(true);
    expect(emittedSession?.uid).toBe('user_123');
  });

  it('should clear session from localStorage and update session$ on clearSession', () => {
    service.saveSession({ uid: 'user_123', email: 'test@notechord.app' });
    expect(service.hasSession()).toBe(true);

    service.clearSession();
    expect(service.hasSession()).toBe(false);
    expect(service.getSession()).toBeNull();
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it('should clear session on logout', async () => {
    service.saveSession({ uid: 'user_123', email: 'test@notechord.app' });
    expect(service.hasSession()).toBe(true);

    await service.logout();
    expect(service.hasSession()).toBe(false);
    expect(service.getSession()).toBeNull();
  });

  it('should handle corrupted localStorage data safely', () => {
    localStorage.setItem(storageKey, '{ invalid json');
    expect(service.getSession()).toBeNull();
    expect(service.hasSession()).toBe(false);
  });

  it('should validate session as true when stored session exists', async () => {
    service.saveSession({ uid: 'user_123', email: 'test@notechord.app' });
    const isValid = await service.validateSession();
    expect(isValid).toBe(true);
  });

  it('should validate session as false when no session exists', async () => {
    service.clearSession();
    const isValid = await service.validateSession();
    expect(isValid).toBe(false);
  });
});

