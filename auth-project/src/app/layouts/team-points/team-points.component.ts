// team-points.component.ts
import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { PointsService } from "../../services/points.service";

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

  // Jugadores por posición
  goalkeepers: any[] = [];
  defenders: any[] = [];
  midfielders: any[] = [];
  forwards: any[] = [];

  loading: boolean = true;
  errorMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private pointsService: PointsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.leagueId = params['leagueId'];
      this.loadTeamWithPoints();
    });
  }

  // team-points.component.ts
  loadTeamWithPoints(): void {
    this.loading = true;
    this.errorMessage = '';

    console.log('Cargando equipo para jornada:', this.selectedMatchday);

    this.pointsService.getTeamPointsForMatchday(this.leagueId, this.selectedMatchday)
      .subscribe({
        next: (response: any) => {
          console.log('Respuesta completa:', response);

          if (response.success) {
            this.teamPlayers = response.data.team.players || [];
            this.formation = response.data.team.formation;
            this.captainId = response.data.team.captainId;
            this.totalTeamPoints = response.data.team.totalPoints || 0;

            console.log('Jugadores recibidos:', this.teamPlayers);

            if (this.teamPlayers.length > 0) {
              this.distributePlayersByPosition();
            } else {
              this.errorMessage = 'No hay jugadores en el equipo';
            }
          } else {
            this.errorMessage = 'Error al cargar los puntos del equipo';
          }
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error completo:', error);
          this.errorMessage = 'Error al cargar los datos';
          this.loading = false;
        }
      });
  }


  onMatchdayChange(event: any): void {
    this.selectedMatchday = parseInt(event.target.value, 10);
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
}
