import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LeagueService } from '../../modals/create-league-modal/services/create-league.service';
import { PointsService } from '../../services/points.service';
import { AuthService } from '../../auth/services/auth.service';
import { ActiveLeagueService } from '../home/services/active-league.service';

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
  // Añadir propiedad para almacenar la jornada de creación
  creationMatchday: number = 1;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private leagueService: LeagueService,
    private pointsService: PointsService,
    private authService: AuthService,
    private activeLeagueService: ActiveLeagueService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.leagueId = params['leagueId'];

      if (!this.leagueId) {
        // Primero verificar si hay una liga activa en el servicio
        const activeLiga = this.activeLeagueService.getActiveLeague();

        if (activeLiga) {
          // Si hay una liga activa, usar esa
          this.leagueId = activeLiga;
          this.loadClassificationData();
        } else {
          // Si no hay liga activa, intentar obtener el equipo más reciente
          this.leagueService.getUserTeams().subscribe({
            next: (response: any) => {
              if (response && response.teams && response.teams.length > 0) {
                this.leagueId = response.teams[0].leagueId;
                this.loadClassificationData();
              } else {
                this.error = "No tienes ningún equipo. Por favor, únete a una liga desde la página 'Mis Ligas'.";
              }
            },
            error: (error) => {
              console.error("Error al obtener equipos del usuario:", error);
              this.error = "Error al cargar tus equipos";
            }
          });
        }
      } else {
        // Si hay leagueId en la URL, usarlo y actualizar la liga activa
        this.activeLeagueService.setActiveLeague(this.leagueId);
        this.loadClassificationData();
      }

      // Actualizar la propiedad ligaActivaId para el menú lateral
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
        this.creationMatchday = league.creationMatchday || 1; // Obtener la jornada de creación

        // Si la liga ya tiene un código de invitación, úsalo
        if (league.inviteCode) {
          this.inviteLink = `${window.location.origin}/join-league/${league.inviteCode}`;
        }
        // Si no tiene código, solicita uno nuevo
        else {
          this.leagueService.generateInviteCode(this.leagueId).subscribe(response => {
            if (response.success) {
              this.inviteLink = `${window.location.origin}/join-league/${response.inviteCode}`;
            }
          });
        }
      },
      error: (err) => {
        console.error('Error al cargar datos de la liga:', err);
        this.error = 'No se pudo cargar la información de la liga';
      }
    });
  }

  loadClassification(): void {
    this.leagueService.getLeagueClassification(this.leagueId).subscribe({
      next: (users) => {
        this.leagueUsers = users;
      },
      error: (err) => {
        console.error('Error al cargar clasificación general:', err);
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
        } else {
          this.error = 'Error al cargar la clasificación por puntos';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar clasificación por puntos:', err);
        this.error = 'No se pudo cargar la clasificación por puntos';
        this.loading = false;
      }
    });
  }

  showInviteModal(): void {
    this.showInvite = !this.showInvite;
  }

  copyInviteLink(inputElement: HTMLInputElement): void {
    inputElement.select();
    document.execCommand('copy');
    // Mostrar notificación de copiado (opcional)
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
      // Navegar a la página de puntos del equipo del usuario seleccionado
      this.router.navigate(['/layouts/team-points', this.leagueId, 'user', userId]);
    }
  }
}
