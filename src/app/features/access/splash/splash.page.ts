import { Component, OnInit, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { NavigationService } from '../../../core/navigation/navigation.service';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: false
})
export class SplashPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly navService = inject(NavigationService);

  isCheckingAuth = true;
  progress = 0;
  minSplashDuration = 2200; // Duración mínima (2.2s) sincronizada con la animación CSS

  async ngOnInit() {
    const startTime = Date.now();
    let isAuthenticated = false;

    try {
      if (typeof this.authService.validateSession === 'function') {
        isAuthenticated = await this.authService.validateSession();
      } else if (this.authService.user$) {
        const user = await firstValueFrom(this.authService.user$);
        isAuthenticated = Boolean(user);
      }
    } catch {
      isAuthenticated = false;
    }

    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, this.minSplashDuration - elapsed);

    if (remainingTime > 0) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, remainingTime));
    }

    // Llevar la barra al 100% y completar
    this.progress = 100;
    this.isCheckingAuth = false;

    if (this.minSplashDuration > 0) {
      // Breve pausa para visualizar el 100% antes de la transición
      await new Promise<void>((resolve) => window.setTimeout(resolve, 180));
    }

    if (isAuthenticated) {
      await this.navService.goToHome(true);
    } else {
      await this.navService.goToLogin('forward');
    }
  }

  goToLogin() {
    return this.navService.goToLogin('forward');
  }
}
