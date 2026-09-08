import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Observable, of } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { AuthService } from '../../../core/auth/auth.service';
import { NavigationService } from '../../../core/navigation/navigation.service';
import { SplashPage } from './splash.page';

describe('SplashPage', () => {
  let component: SplashPage;
  let fixture: ComponentFixture<SplashPage>;
  let authServiceMock: { user$: Observable<any> };
  let navServiceMock: {
    goToHome: ReturnType<typeof vi.fn>;
    goToLogin: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authServiceMock = {
      user$: of(null)
    };

    navServiceMock = {
      goToHome: vi.fn().mockResolvedValue(true),
      goToLogin: vi.fn().mockResolvedValue(true)
    };

    TestBed.configureTestingModule({
      declarations: [SplashPage],
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
  });

  it('should set isCheckingAuth to false when user is null', async () => {
    await component.ngOnInit();
    expect(component.isCheckingAuth).toBe(false);
    expect(navServiceMock.goToHome).not.toHaveBeenCalled();
    expect(navServiceMock.goToLogin).not.toHaveBeenCalled();
  });

  it('should navigate to home when user is logged in', async () => {
    authServiceMock.user$ = of({ uid: 'u123', email: 'test@example.com' } as any);
    await component.ngOnInit();
    expect(navServiceMock.goToHome).toHaveBeenCalledWith(true);
  });

  it('should navigate to login when goToLogin is called', async () => {
    await component.goToLogin();
    expect(navServiceMock.goToLogin).toHaveBeenCalledWith('forward');
  });
});
