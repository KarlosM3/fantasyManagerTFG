// login.component.ts
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
        // Guardar explícitamente el nombre del usuario si no viene en la respuesta
        if (!data.user || !data.user.name) {
          // Usar el email como nombre de usuario si no hay nombre
          const emailParts = user.email.split('@');
          this.authService.setUserName(emailParts[0]);
        }
        this.router.navigate(['/admin/home']);
      },
      error: (error) => {
        this.errorMessage = 'Error al iniciar sesión. Verifica tus credenciales.';
        console.error(error);
      }
    });
  }
}
