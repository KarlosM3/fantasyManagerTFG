import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Player {
  id: string;
  images: {
    transparent: {
      '256x256': string;
    }
  };
  positionId: string;
  nickname: string;
  lastSeasonPoints: string;
  playerStatus: string;
  team: {
    id: string;
    name: string;
    slug: string;
    badgeColor: string;
  };
  points: number;
  averagePoints: number;
  weekPoints: Array<{
    weekNumber: number;
    points: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class PlayerService {
  // URL que apunta al backend
  private apiUrl = 'http://localhost:3000/api/players'; // URL relativa a tu backend

  constructor(private http: HttpClient) { }

  getPlayers(): Observable<Player[]> {
    return this.http.get<Player[]>(this.apiUrl);
  }

  getPlayerById(id: string): Observable<Player> {
    return this.http.get<Player>(`${this.apiUrl}/${id}`);
  }
}
