import { Component, inject } from '@angular/core';

import { AuthService } from '../../../core/auth/auth.service';
import { NavigationService } from '../../../core/navigation/navigation.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage {
  private readonly authService = inject(AuthService);
  private readonly navService = inject(NavigationService);

  email = '';
  password = '';
  errorMessage = '';
  isSubmitting = false;
  isRegisterMode = false;
  statusMessage = '';

  backToSplash() {
    return this.navService.goToSplash('back');
  }

  async login() {
    this.errorMessage = '';
    this.statusMessage = '';
    this.isSubmitting = true;

    try {
      await Promise.race([
        this.isRegisterMode
          ? this.authService.register(this.email, this.password)
          : this.authService.login(this.email, this.password),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('LOGIN_TIMEOUT')), 15000);
        })
      ]);
      await this.navService.goToHome(true);
    } catch (error) {
      this.errorMessage = error instanceof Error && error.message === 'LOGIN_TIMEOUT'
        ? 'La conexión con Firebase tardó demasiado. Comprueba la conexión a Internet.'
        : this.isRegisterMode
          ? 'No se pudo crear la cuenta. Revisa el correo y usa al menos 6 caracteres para la contraseña.'
          : 'No se pudo iniciar sesión. Revisa tus datos y la configuración de Firebase.';
    } finally {
      this.isSubmitting = false;
    }
  }

  toggleRegisterMode() {
    this.isRegisterMode = !this.isRegisterMode;
    this.errorMessage = '';
    this.statusMessage = '';
  }

  async recoverPassword() {
    this.errorMessage = '';
    this.statusMessage = '';

    if (!this.email.trim()) {
      this.errorMessage = 'Escribe tu correo electrónico para recuperar la contraseña.';
      return;
    }

    try {
      await this.authService.resetPassword(this.email.trim());
      this.statusMessage = 'Te enviamos un enlace para restablecer tu contraseña.';
    } catch {
      this.errorMessage = 'No se pudo enviar el correo de recuperación.';
    }
  }
}
