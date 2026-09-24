import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NavController, Platform } from '@ionic/angular';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { NavigationService } from './navigation.service';

describe('NavigationService', () => {
  let service: NavigationService;

  const navCtrlMock = {
    navigateForward: vi.fn().mockResolvedValue(true),
    navigateBack: vi.fn().mockResolvedValue(true),
    navigateRoot: vi.fn().mockResolvedValue(true),
    back: vi.fn()
  };

  const platformMock = {
    backButton: {
      subscribeWithPriority: vi.fn().mockReturnValue({ unsubscribe: vi.fn() })
    }
  };

  const routerMock = {
    url: '/home',
    navigate: vi.fn().mockResolvedValue(true)
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        NavigationService,
        { provide: NavController, useValue: navCtrlMock },
        { provide: Platform, useValue: platformMock },
        { provide: Router, useValue: routerMock }
      ]
    });

    service = TestBed.inject(NavigationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should navigate forward with push', async () => {
    await service.push('/search');
    expect(navCtrlMock.navigateForward).toHaveBeenCalledWith('/search', {
      animated: true,
      animationDirection: 'forward',
      state: undefined
    });
  });

  it('should navigate back with back', async () => {
    await service.back();
    expect(navCtrlMock.back).toHaveBeenCalledWith({
      animated: true,
      animationDirection: 'back'
    });
  });

  it('should replace root route with replace', async () => {
    await service.replace('/home');
    expect(navCtrlMock.navigateRoot).toHaveBeenCalledWith('/home', {
      animated: true,
      animationDirection: 'forward',
      state: undefined
    });
  });

  it('should register hardware back button listener', () => {
    service.initHardwareBackButton();
    expect(platformMock.backButton.subscribeWithPriority).toHaveBeenCalledWith(10, expect.any(Function));
  });
});
