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
        void this.replace('/', undefined, true, 'back');
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
  async replace(
    path: string | any[],
    state?: any,
    animated: boolean = true,
    animationDirection: 'forward' | 'back' = 'forward'
  ): Promise<void> {
    if (this.isNavigating) return;
    this.isNavigating = true;
    try {
      await this.navCtrl.navigateRoot(path as any, {
        animated,
        animationDirection: animated ? animationDirection : undefined,
        state
      });
    } finally {
      setTimeout(() => (this.isNavigating = false), animated ? this.navigationLockMs : 80);
    }
  }
}
