import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  login() {
    if (this.loginForm.invalid) {
      return;
    }

    const user = {
      email: this.loginForm.get('email')?.value,
      password: this.loginForm.get('password')?.value
    };

    this.authService.login(user).subscribe({
      next: (data: any) => {
        if (!data.user || !data.user.name) {
          const emailParts = user.email.split('@');
          this.authService.setUserName(emailParts[0]);
        }
        // Verificar si hay un código de invitación pendiente
        const pendingCode = this.authService.getPendingInviteCode();
        if (pendingCode) {
          this.router.navigate(['/join-league', pendingCode]);
        } else {
          this.router.navigate(['/layouts/home']);
        }
      },
      error: (error) => {
        this.errorMessage = 'Error al iniciar sesión. Verifica tus credenciales.';
        console.error(error);
      }
    });
  }

}
