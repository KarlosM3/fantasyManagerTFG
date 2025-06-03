import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LeagueService } from '../../modals/create-league-modal/services/create-league.service';
import { PointsService } from '../../services/points.service';
import { AuthService } from '../../auth/services/auth.service';
import { ActiveLeagueService } from '../home/services/active-league.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-classification',
  templateUrl: './classification.component.html',
  styleUrls: ['./classification.component.scss']
})
export class ClassificationComponent implements OnInit {
  leagueId!: string;
  leagueName: string = 'Mi Liga';
  leagueUsers: any[] = [];
  pointsStandings: any[] = [];
  showPointsStandings: boolean = false;
  showInvite: boolean = false;
  inviteLink: string = '';
  ligaActivaId: string | null = null;
  loading: boolean = false;
  error: string = '';
  creationMatchday: number = 1;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private leagueService: LeagueService,
    private pointsService: PointsService,
    private authService: AuthService,
    private activeLeagueService: ActiveLeagueService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.leagueId = params['leagueId'];

      if (!this.leagueId) {
        const activeLiga = this.activeLeagueService.getActiveLeague();

        if (activeLiga) {
          this.leagueId = activeLiga;
          this.loadClassificationData();
        } else {
          this.leagueService.getUserTeams().subscribe({
            next: (response: any) => {
              if (response && response.teams && response.teams.length > 0) {
                this.leagueId = response.teams[0].leagueId;
                this.loadClassificationData();
              } else {
                this.error = "No tienes ningún equipo. Por favor, únete a una liga desde la página 'Mis Ligas'.";
                this.notificationService.showWarning("No tienes ningún equipo");
              }
            },
            error: (error) => {
              console.error("Error al obtener equipos del usuario:", error);
              this.error = "Error al cargar tus equipos";
              this.notificationService.showError("Error al cargar tus equipos");
            }
          });
        }
      } else {
        this.activeLeagueService.setActiveLeague(this.leagueId);
        this.loadClassificationData();
      }

      this.ligaActivaId = this.activeLeagueService.getActiveLeague();
    });
  }

  // Método para cargar todos los datos de clasificación
  loadClassificationData(): void {
    this.loadLeagueData();
    this.loadClassification();
    this.loadPointsStandings();
  }


  loadLeagueData(): void {
    this.leagueService.getLeagueById(this.leagueId).subscribe({
      next: (league: any) => {
        this.leagueName = league.name;
        this.creationMatchday = league.creationMatchday || 1;

        if (league.inviteCode) {
          this.inviteLink = `${window.location.origin}/join-league/${league.inviteCode}`;
        } else {
          this.leagueService.generateInviteCode(this.leagueId).subscribe({
            next: (response) => {
              if (response.success) {
                this.inviteLink = `${window.location.origin}/join-league/${response.inviteCode}`;
              }
            },
            error: (error) => {
              this.notificationService.showError('Error al generar código de invitación');
            }
          });
        }
      },
      error: (err) => {
        console.error('Error al cargar datos de la liga:', err);
        this.error = 'No se pudo cargar la información de la liga';
        this.notificationService.showError('Error al cargar información de la liga');
      }
    });
  }

  loadClassification(): void {
    this.leagueService.getLeagueClassification(this.leagueId).subscribe({
      next: (users) => {
        this.leagueUsers = users;
        this.notificationService.showSuccess('Clasificación general cargada');
      },
      error: (err) => {
        console.error('Error al cargar clasificación general:', err);
        this.notificationService.showError('Error al cargar clasificación general');
      }
    });
  }

  loadPointsStandings(): void {
    this.loading = true;
    this.pointsService.getLeagueStandingsByPoints(this.leagueId).subscribe({
      next: (response: any) => {
        console.log('Respuesta de clasificación por puntos:', response);
        if (response.success) {
          this.pointsStandings = response.data;
          this.notificationService.showSuccess('Clasificación por puntos cargada');
        } else {
          this.error = 'Error al cargar la clasificación por puntos';
          this.notificationService.showError('Error al cargar clasificación por puntos');
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar clasificación por puntos:', err);
        this.error = 'No se pudo cargar la clasificación por puntos';
        this.notificationService.showError('No se pudo cargar la clasificación por puntos');
        this.loading = false;
      }
    });
  }

  showInviteModal(): void {
    this.showInvite = !this.showInvite;
    if (this.showInvite) {
      this.notificationService.showInfo('Comparte este enlace para invitar jugadores');
    }
  }

  async copyInviteLink(inputElement: HTMLInputElement): Promise<void> {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(this.inviteLink);
        this.notificationService.showSuccess('Enlace de invitación copiado al portapapeles');
      } else {
        inputElement.select();
        document.execCommand('copy');
        this.notificationService.showSuccess('Enlace de invitación copiado al portapapeles');
      }
    } catch (error) {
      console.error('Error al copiar:', error);
      this.notificationService.showError('Error al copiar el enlace');
    }
  }

  getUserInitials(username: string): string {
    return username.charAt(0).toUpperCase();
  }

  isCurrentUser(userId: string): boolean {
    return userId === this.authService.getCurrentUserId();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  // Método para calcular la media de puntos
  getAveragePoints(team: any): string {
    if (!team.matchdays_played || team.matchdays_played === 0) {
      return '0';
    }
    return (team.total_points / team.matchdays_played).toFixed(1);
  }

  navigateToUserTeam(userId: string): void {
    if (this.leagueId && userId) {
      this.notificationService.showInfo('Navegando al equipo del usuario');
      this.router.navigate(['/layouts/team-points', this.leagueId, 'user', userId]);
    } else {
      this.notificationService.showWarning('No se puede navegar al equipo del usuario');
    }
  }
}
