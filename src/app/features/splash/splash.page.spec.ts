import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Observable, of } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { AuthService } from '../../core/auth/auth.service';
import { NavigationService } from '../../core/navigation/navigation.service';
import { SplashPage } from './splash.page';

describe('SplashPage', () => {
  let component: SplashPage;
  let fixture: ComponentFixture<SplashPage>;
  let authServiceMock: {
    user$: Observable<any>;
    validateSession: ReturnType<typeof vi.fn>;
  };
  let navServiceMock: {
    replace: ReturnType<typeof vi.fn>;
    goToHome: ReturnType<typeof vi.fn>;
    goToLogin: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authServiceMock = {
      user$: of(null),
      validateSession: vi.fn().mockResolvedValue(false)
    };

    navServiceMock = {
      replace: vi.fn().mockResolvedValue(true),
      goToHome: vi.fn().mockResolvedValue(true),
      goToLogin: vi.fn().mockResolvedValue(true)
    };

    TestBed.configureTestingModule({
      imports: [SplashPage],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: NavigationService, useValue: navServiceMock }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    });

    fixture = TestBed.createComponent(SplashPage);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
    expect(component.isCheckingAuth).toBe(true);
    expect(component.progress).toBe(0);
  });

  it('should navigate to login when user is not logged in without button', async () => {
    component.minSplashDuration = 0;
    authServiceMock.validateSession.mockResolvedValue(false);
    await component.ngOnInit();
    expect(component.isCheckingAuth).toBe(false);
    expect(component.progress).toBe(100);
    expect(navServiceMock.replace).toHaveBeenCalledWith('/login');
  });

  it('should navigate to home (folders) when user session is valid', async () => {
    component.minSplashDuration = 0;
    authServiceMock.validateSession.mockResolvedValue(true);
    await component.ngOnInit();
    expect(component.isCheckingAuth).toBe(false);
    expect(component.progress).toBe(100);
    expect(navServiceMock.replace).toHaveBeenCalledWith('/home');
  });

  it('should fallback to user$ when validateSession is not available', async () => {
    component.minSplashDuration = 0;
    delete (authServiceMock as any).validateSession;
    authServiceMock.user$ = of({ uid: 'u123' } as any);
    await component.ngOnInit();
    expect(navServiceMock.replace).toHaveBeenCalledWith('/home');
  });

  it('should navigate to login when goToLogin is called', async () => {
    await component.goToLogin();
    expect(navServiceMock.replace).toHaveBeenCalledWith('/login');
  });
});
