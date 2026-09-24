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

  it('should navigate to splash as root', async () => {
    await service.goToSplash('back');
    expect(navCtrlMock.navigateRoot).toHaveBeenCalledWith('/', {
      animated: true,
      animationDirection: 'back'
    });
  });

  it('should navigate to home as root', async () => {
    await service.goToHome(true);
    expect(navCtrlMock.navigateRoot).toHaveBeenCalledWith('/home', {
      animated: true,
      animationDirection: 'forward'
    });
  });

  it('should navigate to home as back', async () => {
    await service.goToHome(false);
    expect(navCtrlMock.navigateBack).toHaveBeenCalledWith('/home');
  });

  it('should navigate to folder notes with forward animation', async () => {
    await service.goToFolderNotes('folder-123');
    expect(navCtrlMock.navigateForward).toHaveBeenCalledWith(['/notes', 'folder-123']);
  });

  it('should navigate to note editor with forward animation', async () => {
    await service.goToNoteEditor('folder-123', 'note-456');
    expect(navCtrlMock.navigateForward).toHaveBeenCalledWith(['/notes', 'folder-123', 'note-456']);
  });

  it('should navigate to create note with forward animation', async () => {
    await service.goToCreateNote('folder-123');
    expect(navCtrlMock.navigateForward).toHaveBeenCalledWith(['/notes', 'folder-123', 'new']);
  });

  it('should navigate to settings with forward animation', async () => {
    await service.goToSettings();
    expect(navCtrlMock.navigateForward).toHaveBeenCalledWith('/settings');
  });

  it('should navigate to search with forward animation', async () => {
    await service.goToSearch();
    expect(navCtrlMock.navigateForward).toHaveBeenCalledWith('/search');
  });

  it('should navigate to login as root', async () => {
    await service.goToLogin('back');
    expect(navCtrlMock.navigateRoot).toHaveBeenCalledWith('/login', {
      animated: true,
      animationDirection: 'back'
    });
  });

  it('should navigate back to folders', async () => {
    await service.backToFolders();
    expect(navCtrlMock.navigateBack).toHaveBeenCalledWith('/home');
  });

  it('should navigate back to notes of folder', async () => {
    await service.backToNotes('folder-123');
    expect(navCtrlMock.navigateBack).toHaveBeenCalledWith(['/notes', 'folder-123']);
  });

  it('should replace note url via router', async () => {
    await service.replaceNoteUrl('folder-123', 'note-456');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/notes', 'folder-123', 'note-456'], {
      replaceUrl: true
    });
  });

  it('should register hardware back button listener', () => {
    service.initHardwareBackButton();
    expect(platformMock.backButton.subscribeWithPriority).toHaveBeenCalledWith(10, expect.any(Function));
  });
});

