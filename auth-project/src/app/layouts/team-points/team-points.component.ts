// src/app/layouts/team-points/team-points.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PointsService } from '../../services/points.service';
import { PlayerPoints, MatchdayPoints } from '../../shared/models/points.model';

@Component({
  selector: 'app-team-points',
  templateUrl: './team-points.component.html',
  styleUrls: ['./team-points.component.scss']
})
export class TeamPointsComponent implements OnInit {
  teamId!: string;
  matchday: number = 1;
  playerPoints: PlayerPoints[] = [];
  pointsHistory: MatchdayPoints[] = [];
  totalPoints: number = 0;
  loading: boolean = true;
  availableMatchdays: number[] = [];

  // Jugadores por posición
  goalkeepers: PlayerPoints[] = [];
  defenders: PlayerPoints[] = [];
  midfielders: PlayerPoints[] = [];
  forwards: PlayerPoints[] = [];

  constructor(
    private route: ActivatedRoute,
    private pointsService: PointsService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.teamId = params['teamId'];
      this.matchday = +params['matchday'] || 1;
      this.loadPointsHistory();
    });
  }

  loadPointsHistory(): void {
    this.loading = true;
    this.pointsService.getTeamPointsHistory(this.teamId).subscribe({
      next: (response) => {
        if (response.success) {
          this.pointsHistory = response.data;

          // Crear array con todas las jornadas disponibles
          this.availableMatchdays = this.pointsHistory.map(mp => mp.matchday);

          if (this.availableMatchdays.length > 0) {
            // Si no se especificó jornada, usar la última
            if (!this.route.snapshot.params['matchday']) {
              this.matchday = Math.max(...this.availableMatchdays);
            }

            // Cargar puntos de la jornada seleccionada
            this.loadPointsByMatchday(this.matchday);
          } else {
            this.loading = false;
          }

          // Calcular puntos totales
          this.totalPoints = this.pointsHistory.reduce((sum, mp) => sum + mp.total_points, 0);
        } else {
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error al cargar historial de puntos:', error);
        this.loading = false;
      }
    });
  }

  loadPointsByMatchday(matchday: number): void {
    this.loading = true;
    this.matchday = matchday;

    this.pointsService.getTeamPointsByMatchday(this.teamId, matchday).subscribe({
      next: (response) => {
        if (response.success) {
          this.playerPoints = response.data;
          this.organizePlayersByPosition();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar puntos de la jornada:', error);
        this.loading = false;
      }
    });
  }

  organizePlayersByPosition(): void {
    // Clasificar jugadores por posición
    this.goalkeepers = this.playerPoints.filter(p => p.position === 'GK' || p.positionId === 1);
    this.defenders = this.playerPoints.filter(p => p.position === 'DEF' || p.positionId === 2);
    this.midfielders = this.playerPoints.filter(p => p.position === 'MID' || p.positionId === 3);
    this.forwards = this.playerPoints.filter(p => p.position === 'FWD' || p.positionId === 4);
  }

  changeMatchday(matchday: number): void {
    this.loadPointsByMatchday(matchday);
  }

  getMatchdayPoints(matchday: number): number {
    const found = this.pointsHistory.find(mp => mp.matchday === matchday);
    return found ? found.total_points : 0;
  }
}
