import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PlayerPoints, MatchdayPoints, TeamStanding } from '../shared/models/points.model';

@Injectable({
  providedIn: 'root'
})
export class PointsService {
  private apiUrl = 'http://localhost:3000/api/points';

  constructor(private http: HttpClient) { }

  // Obtener puntos de un equipo por jornada
  getTeamPointsByMatchday(teamId: string, matchday: number): Observable<{success: boolean, data: PlayerPoints[]}> {
    return this.http.get<{success: boolean, data: PlayerPoints[]}>(`${this.apiUrl}/team/${teamId}/matchday/${matchday}`);
  }

  // Obtener historial de puntos por jornada
  getTeamPointsHistory(teamId: string): Observable<{success: boolean, data: MatchdayPoints[]}> {
    return this.http.get<{success: boolean, data: MatchdayPoints[]}>(`${this.apiUrl}/team/${teamId}/history`);
  }

  // Obtener clasificación de la liga por puntos
  getLeagueStandingsByPoints(leagueId: string): Observable<{success: boolean, data: TeamStanding[]}> {
    return this.http.get<{success: boolean, data: TeamStanding[]}>(`${this.apiUrl}/league/${leagueId}/standings`);
  }

  // Sincronizar puntos desde API externa (solo para administradores)
  syncPointsFromExternalAPI(matchday: number): Observable<{success: boolean, message: string}> {
    return this.http.post<{success: boolean, message: string}>(`${this.apiUrl}/sync/${matchday}`, {});
  }
}
