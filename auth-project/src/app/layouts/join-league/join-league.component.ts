import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LeagueService } from '../../modals/create-league-modal/services/create-league.service';
import { AuthService } from '../../auth/services/auth.service';
import { NotificationService } from '../../services/notification.service';

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
    private notificationService: NotificationService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.isAuthenticated = this.authService.isLoggedIn();
    this.inviteCode = this.route.snapshot.paramMap.get('code');

    if (this.inviteCode && this.isAuthenticated) {
      this.joinLeague();
    } else if (!this.isAuthenticated) {
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('pendingInviteCode', this.inviteCode || '');
      }
      this.errorMessage = 'Debes iniciar sesión para unirte a una liga';
      this.notificationService.showWarning('Debes iniciar sesión para unirte a una liga');
    }
  }

  joinLeague() {
    if (!this.inviteCode) {
      this.notificationService.showError('Código de invitación no válido');
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.notificationService.showInfo('Uniéndose a la liga...');

    this.leagueService.joinLeagueByCode(this.inviteCode).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.randomTeam = res.team;
        this.isTeamModalOpen = true;
        this.leagueId = res.leagueId;
        this.notificationService.showSuccess('¡Te has unido a la liga exitosamente!');
      },
      error: (err) => {
        this.isLoading = false;

        if (err.error && err.error.message === 'La liga ha alcanzado el límite máximo de 16 participantes') {
          this.errorMessage = 'Esta liga ya está llena (máximo 16 participantes)';
          this.notificationService.showWarning('Liga llena: máximo 16 participantes');
        } else if (err.error && err.error.message === 'Ya eres miembro de esta liga') {
          this.errorMessage = 'Ya eres miembro de esta liga';
          this.notificationService.showInfo('Ya eres miembro de esta liga');
        } else {
          this.errorMessage = err.error?.message || 'Error al unirse a la liga';
          this.notificationService.showError(err.error?.message || 'Error al unirse a la liga');
        }
      }
    });
  }


  closeTeamModalAndGoToClassification(leagueId: string) {
    this.isTeamModalOpen = false;
    this.notificationService.showSuccess('¡Bienvenido a tu nueva liga!');
    this.router.navigate(['/layouts/classification', leagueId]);
  }

  goToLogin() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('pendingInviteCode', this.inviteCode || '');
      const currentUrl = this.router.url;
      this.authService.setRedirectUrl(currentUrl);
    }
    this.notificationService.showInfo('Redirigiendo al inicio de sesión...');
    this.router.navigate(['/auth/login']);
  }

  goToClassification() {
    if (!this.inviteCode) {
      this.notificationService.showError('Código de invitación no válido');
      return;
    }

    this.isLoading = true;
    this.leagueService.getLeagueByInviteCode(this.inviteCode).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.notificationService.showInfo('Navegando a la clasificación...');
        this.router.navigate(['/layouts/classification', res.leagueId]);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Error al obtener información de la liga';
        this.notificationService.showError('Error al obtener información de la liga');
      }
    });
  }

  goToMyTeam() {
    if (!this.inviteCode) {
      this.notificationService.showError('Código de invitación no válido');
      return;
    }

    this.isLoading = true;
    this.leagueService.getLeagueByInviteCode(this.inviteCode).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.notificationService.showInfo('Navegando a tu equipo...');
        this.router.navigate(['/layouts/my-team', res.leagueId]);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Error al obtener información de la liga';
        this.notificationService.showError('Error al obtener información de la liga');
      }
    });
  }
}
