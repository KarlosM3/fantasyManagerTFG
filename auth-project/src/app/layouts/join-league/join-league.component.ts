import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LeagueService } from '../../modals/create-league-modal/services/create-league.service';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: 'app-join-league',
  templateUrl: './join-league.component.html',
  styleUrls: ['./join-league.component.scss']
})
export class JoinLeagueComponent implements OnInit {
  inviteCode: string | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  randomTeam: any[] = [];
  isTeamModalOpen = false;
  leagueId: string = ''; // Añade esta propiedad
  isAuthenticated = false; // Propiedad para verificar si el usuario está autenticado

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private leagueService: LeagueService,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    // Verificar si el usuario está autenticado
    this.isAuthenticated = this.authService.isLoggedIn();

    // Obtener el código de invitación de la URL
    this.inviteCode = this.route.snapshot.paramMap.get('code');

    // Si el usuario está autenticado, intentar unirse automáticamente
    if (this.inviteCode && this.isAuthenticated) {
      this.joinLeague();
    } else if (!this.isAuthenticated) {
      // Si no está autenticado, guardar el código y redirigir al login
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('pendingInviteCode', this.inviteCode || '');
      }
      this.errorMessage = 'Debes iniciar sesión para unirte a una liga';
    }
  }

  joinLeague() {
    if (!this.inviteCode) return;

    this.isLoading = true;
    this.errorMessage = null;

    this.leagueService.joinLeagueByCode(this.inviteCode).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        // Guardar el equipo y mostrar modal
        this.randomTeam = res.team;
        this.isTeamModalOpen = true;
        this.leagueId = res.leagueId;
        // No navegamos inmediatamente a clasificación
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Error al unirse a la liga';
      }
    });
  }

  // Método para cerrar el modal y navegar a clasificación
  closeTeamModalAndGoToClassification(leagueId: string) {
    this.isTeamModalOpen = false;
    this.router.navigate(['/layouts/classification', leagueId]);
  }

  goToLogin() {
    if (isPlatformBrowser(this.platformId)) {
      // Guardar el código de invitación antes de redirigir
      localStorage.setItem('pendingInviteCode', this.inviteCode || '');

      // Guardar la URL completa para redirección
      const currentUrl = this.router.url;
      this.authService.setRedirectUrl(currentUrl);
    }

    this.router.navigate(['/auth/login']);
  }
}
