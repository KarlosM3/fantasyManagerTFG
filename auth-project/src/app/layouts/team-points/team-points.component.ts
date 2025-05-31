// team-points.component.ts
import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { PointsService } from "../../services/points.service";
import { LeagueService } from "../../modals/create-league-modal/services/create-league.service";
import { ActiveLeagueService } from "../home/services/active-league.service";
import { PlayerBadgeService } from "../../services/player-badge.service";
import { NotificationService } from "../../services/notification.service";

@Component({
  selector: "app-team-points",
  templateUrl: "./team-points.component.html",
  styleUrls: ["./team-points.component.scss"],
})
export class TeamPointsComponent implements OnInit {
  leagueId!: string;
  selectedMatchday: number = 1;
  availableMatchdays: number[] = Array.from({length: 38}, (_, i) => i + 1);

  // Datos del equipo
  teamPlayers: any[] = [];
  formation: string = "4-4-2";
  captainId: string = '';
  totalTeamPoints: number = 0;

  // Añadir propiedad para el userId
  userId: string | null = null;
  userName: string = 'Mi Equipo'; // Nombre por defecto

  // Jugadores por posición
  goalkeepers: any[] = [];
  defenders: any[] = [];
  midfielders: any[] = [];
  forwards: any[] = [];

  loading: boolean = true;
  errorMessage: string = '';
  ligaActivaId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private pointsService: PointsService,
    private activeLeagueService: ActiveLeagueService,
    private leagueService: LeagueService,
    public playerBadgeService: PlayerBadgeService,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.leagueId = params['leagueId'];
      this.userId = params['userId'];

      if (!this.leagueId) {
        const activeLiga = this.activeLeagueService.getActiveLeague();

        if (activeLiga) {
          this.leagueId = activeLiga;
          this.loadCurrentMatchdayAndData();
        } else {
          this.leagueService.getUserTeams().subscribe({
            next: (response: any) => {
              if (response && response.teams && response.teams.length > 0) {
                this.leagueId = response.teams[0].leagueId;
                this.loadCurrentMatchdayAndData();
              } else {
                this.loading = false;
                this.errorMessage = "No tienes ningún equipo. Por favor, únete a una liga desde la página 'Mis Ligas'.";
                this.notificationService.showWarning("No tienes ningún equipo");
              }
            },
            error: (error) => {
              console.error("Error al obtener equipos del usuario:", error);
              this.loading = false;
              this.errorMessage = "Error al cargar tus equipos";
              this.notificationService.showError("Error al cargar tus equipos");
            }
          });
        }
      } else {
        this.activeLeagueService.setActiveLeague(this.leagueId);
        this.loadCurrentMatchdayAndData();
      }

      this.ligaActivaId = this.activeLeagueService.getActiveLeague();
    });
  }



  // Método para obtener la jornada actual y cargar datos
  loadCurrentMatchdayAndData(): void {
    this.pointsService.getCurrentMatchday().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.selectedMatchday = response.data.matchday;
          this.availableMatchdays = Array.from({length: this.selectedMatchday}, (_, i) => i + 1);
          console.log(`Jornada actual establecida: ${this.selectedMatchday}`);
          this.notificationService.showInfo(`Cargando datos de jornada ${this.selectedMatchday}`);
        }
        this.loadTeamWithPoints();
      },
      error: (error) => {
        console.error('Error al obtener la jornada actual:', error);
        this.notificationService.showWarning('Error al obtener jornada actual, usando jornada 1');
        this.loadTeamWithPoints();
      }
    });
  }


  // team-points.component.ts
  loadTeamWithPoints(): void {
    this.loading = true;
    this.errorMessage = '';
    console.log('Cargando equipo para jornada:', this.selectedMatchday);

    if (this.userId) {
      this.pointsService.getUserTeamPointsForMatchday(this.leagueId, this.userId, this.selectedMatchday)
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              this.teamPlayers = response.data.team.players || [];
              this.formation = response.data.team.formation;
              this.captainId = response.data.team.captainId;
              this.totalTeamPoints = response.data.team.totalPoints || 0;
              this.userName = response.data.user.name;

              if (this.teamPlayers.length > 0) {
                this.distributePlayersByPosition();
                this.notificationService.showSuccess(`Equipo de ${this.userName} cargado correctamente`);
              } else {
                this.errorMessage = 'No hay jugadores en el equipo';
                this.notificationService.showWarning('No hay jugadores en el equipo');
              }
            } else {
              this.errorMessage = 'Error al cargar los puntos del equipo';
              this.notificationService.showError('Error al cargar los puntos del equipo');
            }
            this.loading = false;
          },
          error: (error: any) => {
            console.error('Error completo:', error);
            this.errorMessage = 'Error al cargar los datos';
            this.notificationService.showError('Error al cargar los datos del equipo');
            this.loading = false;
          }
        });
    } else {
      this.pointsService.getTeamPointsForMatchday(this.leagueId, this.selectedMatchday)
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              this.teamPlayers = response.data.team.players || [];
              this.formation = response.data.team.formation;
              this.captainId = response.data.team.captainId;
              this.totalTeamPoints = response.data.team.totalPoints || 0;

              if (this.teamPlayers.length > 0) {
                this.distributePlayersByPosition();
                this.notificationService.showSuccess('Tu equipo cargado correctamente');
              } else {
                this.errorMessage = 'No hay jugadores en el equipo';
                this.notificationService.showWarning('No hay jugadores en el equipo');
              }
            } else {
              this.errorMessage = 'Error al cargar los puntos del equipo';
              this.notificationService.showError('Error al cargar los puntos del equipo');
            }
            this.loading = false;
          },
          error: (error: any) => {
            console.error('Error completo:', error);
            this.errorMessage = 'Error al cargar los datos';
            this.notificationService.showError('Error al cargar los datos del equipo');
            this.loading = false;
          }
        });
    }
  }


  onMatchdayChange(event: any): void {
    this.selectedMatchday = parseInt(event.target.value, 10);
    this.notificationService.showInfo(`Cambiando a jornada ${this.selectedMatchday}`);
    this.loadTeamWithPoints();
  }

  distributePlayersByPosition(): void {
    console.log('Distribuyendo jugadores por posición');

    // Limpiar arrays
    this.goalkeepers = [];
    this.defenders = [];
    this.midfielders = [];
    this.forwards = [];

    // Distribuir jugadores según posición
    this.teamPlayers.forEach(player => {
      const positionId = parseInt(player.positionId, 10);

      switch(positionId) {
        case 1: this.goalkeepers.push(player); break;
        case 2: this.defenders.push(player); break;
        case 3: this.midfielders.push(player); break;
        case 4: this.forwards.push(player); break;
      }
    });

    console.log('Jugadores distribuidos:', {
      goalkeepers: this.goalkeepers.length,
      defenders: this.defenders.length,
      midfielders: this.midfielders.length,
      forwards: this.forwards.length
    });

    // Aplicar formación
    this.applyFormation();
  }

  applyFormation(): void {
    const formationParts = this.formation.split('-').map(Number);

    // Siempre 1 portero
    this.goalkeepers = this.goalkeepers.slice(0, 1);

    // Aplicar formación a las demás posiciones
    if (formationParts.length === 3) {
      this.defenders = this.defenders.slice(0, formationParts[0]);
      this.midfielders = this.midfielders.slice(0, formationParts[1]);
      this.forwards = this.forwards.slice(0, formationParts[2]);
    }
  }

  getTotalPoints(): number {
    return this.totalTeamPoints;
  }

  getFormationString(): string {
    return this.formation;
  }

  isPlayerCaptain(playerId: string): boolean {
    return this.captainId === playerId;
  }

  // Métodos para manejar el estado del jugador
  getPlayerStatus(player: any): string {
    return this.playerBadgeService.getPlayerStatus(player);
  }

  getStatusClass(player: any): string {
    const status = this.getPlayerStatus(player);
    return this.playerBadgeService.getStatusClass(status);
  }
}
