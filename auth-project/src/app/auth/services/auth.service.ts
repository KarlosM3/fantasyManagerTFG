// auth.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

interface AuthResponse {
  token: string;
  // otras propiedades si las hay
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api'; // URL de tu backend local
  private token: string | null = null;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  login(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, user)
      .pipe(
        tap((response: any) => {
          if (response && response.token) {
            this.token = response.token;
            this.setToken(response.token);

            // Guardar el nombre del usuario
            if (response.user && response.user.name) {
              this.setUserName(response.user.name);
            }
          }
        })
      );
  }

  // Método para guardar el nombre del usuario
  setUserName(name: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('userName', name);
    }
  }

  // Método para obtener el nombre del usuario
  getUserName(): string {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('userName') || 'Usuario';
    }
    return 'Usuario';
  }

  register(user: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, user);
  }

  setToken(token: string): void {
    this.token = token;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('token', token);
    }
  }

  getToken(): string | null {
    if (!this.token && isPlatformBrowser(this.platformId)) {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  isLoggedIn(): boolean {
    return this.getToken() !== null;
  }

  logout(): void {
    this.token = null;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
    }
  }

  setRedirectUrl(url: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('redirectUrl', url);
    }
  }

  // Método para obtener la URL de redirección
  getRedirectUrl(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('redirectUrl');
    }
    return null;
  }

  // Método para limpiar la URL de redirección
  clearRedirectUrl(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('redirectUrl');
    }
  }

  // Método para verificar y procesar invitaciones pendientes
  processPendingInvite(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const pendingCode = localStorage.getItem('pendingInviteCode');
      if (pendingCode) {
        localStorage.removeItem('pendingInviteCode');
        return true;
      }
    }
    return false;
  }

  // Método para guardar el código de invitación pendiente
  getPendingInviteCode(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('pendingInviteCode');
    }
    return null;
  }
}
