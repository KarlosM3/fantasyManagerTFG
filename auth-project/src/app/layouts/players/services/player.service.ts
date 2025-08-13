import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environment/environment';

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
  private apiUrl = `${environment.apiUrl}/players`;

  constructor(private http: HttpClient) { }

  getPlayers(): Observable<Player[]> {
    return this.http.get<Player[]>(this.apiUrl);
  }

  getPlayerById(id: string): Observable<Player> {
    return this.http.get<Player>(`${this.apiUrl}/${id}`);
  }
}
