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

  async ngOnInit() {
    const [user] = await Promise.all([
      firstValueFrom(this.authService.user$),
      new Promise<void>((resolve) => window.setTimeout(resolve, 700))
    ]);

    if (user) {
      await this.navService.goToHome(true);
    } else {
      await this.navService.goToLogin('forward');
    }
  }
}
