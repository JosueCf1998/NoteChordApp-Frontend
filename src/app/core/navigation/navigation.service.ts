import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { IonRouterOutlet, NavController, Platform } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly navCtrl = inject(NavController);
  private readonly platform = inject(Platform);
  private readonly router = inject(Router);

  private isNavigating = false;
  private readonly navigationLockMs = 150;
  private routerOutlet?: IonRouterOutlet;

  setRouterOutlet(outlet?: IonRouterOutlet) {
    this.routerOutlet = outlet;
  }

  initHardwareBackButton(outlet?: IonRouterOutlet) {
    if (outlet) {
      this.setRouterOutlet(outlet);
    }

    this.platform.backButton.subscribeWithPriority(10, () => {
      const currentUrl = this.router.url.split('?')[0];
      if (currentUrl === '/home' || currentUrl === '/') {
        void App.exitApp();
      } else if (this.routerOutlet?.canGoBack()) {
        void this.routerOutlet.pop();
      } else if (currentUrl === '/login') {
        void this.goToSplash('back');
      } else {
        void App.exitApp();
      }
    });
  }

  /**
   * Navegación hacia adelante protegida con bloqueo anti-rebote (debounce lock).
   */
  async push(path: string | any[], state?: any): Promise<void> {
    if (this.isNavigating) return;
    this.isNavigating = true;
    try {
      await this.navCtrl.navigateForward(path as any, {
        animated: true,
        animationDirection: 'forward',
        state
      });
    } finally {
      setTimeout(() => (this.isNavigating = false), this.navigationLockMs);
    }
  }

  /**
   * Navegación hacia atrás protegida con bloqueo anti-rebote.
   */
  async back(): Promise<void> {
    if (this.isNavigating) return;
    this.isNavigating = true;
    try {
      await this.navCtrl.back({ animated: true, animationDirection: 'back' });
    } finally {
      setTimeout(() => (this.isNavigating = false), this.navigationLockMs);
    }
  }

  /**
   * Reemplazo de ruta raíz protegido con bloqueo anti-rebote.
   */
  async replace(path: string | any[], state?: any, animated: boolean = true): Promise<void> {
    if (this.isNavigating) return;
    this.isNavigating = true;
    try {
      await this.navCtrl.navigateRoot(path as any, {
        animated,
        animationDirection: animated ? 'back' : undefined,
        state
      });
    } finally {
      setTimeout(() => (this.isNavigating = false), animated ? this.navigationLockMs : 80);
    }
  }

  // --- Métodos de dominio de NoteChord con anti-rebote integrado ---

  goToSplash(direction: 'forward' | 'back' = 'back') {
    return this.navCtrl.navigateRoot('/', {
      animated: true,
      animationDirection: direction
    });
  }

  goToHome(asRoot = false) {
    if (asRoot) {
      return this.navCtrl.navigateRoot('/home', {
        animated: true,
        animationDirection: 'forward'
      });
    }
    return this.navCtrl.navigateBack('/home');
  }

  goToLogin(direction: 'forward' | 'back' = 'forward') {
    return this.navCtrl.navigateRoot('/login', {
      animated: true,
      animationDirection: direction
    });
  }

  goToFolderNotes(folderId: string) {
    return this.navCtrl.navigateForward(['/notes', folderId]);
  }

  goToNoteEditor(folderId: string, noteId: string) {
    return this.navCtrl.navigateForward(['/notes', folderId, noteId]);
  }

  goToCreateNote(folderId: string) {
    return this.navCtrl.navigateForward(['/notes', folderId, 'new']);
  }

  goToSettings() {
    return this.navCtrl.navigateForward('/settings');
  }

  goToSearch() {
    return this.navCtrl.navigateForward('/search');
  }

  backToFolders() {
    return this.navCtrl.navigateBack('/home');
  }

  backToNotes(folderId: string) {
    return this.navCtrl.navigateBack(['/notes', folderId]);
  }

  replaceNoteUrl(folderId: string, noteId: string) {
    return this.router.navigate(['/notes', folderId, noteId], { replaceUrl: true });
  }
}
