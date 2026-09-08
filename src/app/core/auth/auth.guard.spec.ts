import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  let authServiceMock: {
    isLoggedIn: ReturnType<typeof vi.fn>;
    validateSession: ReturnType<typeof vi.fn>;
  };
  let routerMock: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authServiceMock = {
      isLoggedIn: vi.fn(),
      validateSession: vi.fn()
    };
    routerMock = {
      createUrlTree: vi.fn().mockReturnValue('/login')
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });
  });

  it('should allow navigation when user is logged in', async () => {
    authServiceMock.isLoggedIn.mockReturnValue(true);

    const result = await TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    expect(result).toBe(true);
  });

  it('should allow navigation when session validates successfully', async () => {
    authServiceMock.isLoggedIn.mockReturnValue(false);
    authServiceMock.validateSession.mockResolvedValue(true);

    const result = await TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    expect(result).toBe(true);
  });

  it('should redirect to login when session is invalid', async () => {
    authServiceMock.isLoggedIn.mockReturnValue(false);
    authServiceMock.validateSession.mockResolvedValue(false);

    const result = await TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    expect(result).toBe('/login');
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});

