// points.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PointsService {
  private apiUrl = 'http://localhost:3000/api/points';

  constructor(private http: HttpClient) {}

  // Obtener puntos de un equipo por jornada
  getTeamPointsForMatchday(leagueId: string, matchday: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/league/${leagueId}/matchday/${matchday}`);
  }

  // Añadir este método para obtener la clasificación por puntos
  getLeagueStandingsByPoints(leagueId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/league/${leagueId}/standings`);
  }
}
