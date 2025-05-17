import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Player } from '../../../player.interface';

@Injectable({
  providedIn: 'root'
})
export class LeagueService {
  private apiUrl = 'http://localhost:3000/api/leagues';

  constructor(private http: HttpClient) {}

  getUserLeagues(): Observable<any> {
    return this.http.get(`${this.apiUrl}/mine`);
  }

  createLeague(leagueData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/`, leagueData);
  }

  joinLeague(leagueId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${leagueId}/join`, {});
  }

  assignRandomTeam(leagueId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${leagueId}/assign-random-team`, {});
  }

  getLeagueClassification(leagueId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${leagueId}/classification`);
  }

  generateInviteCode(leagueId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${leagueId}/generate-invite-code`, {});
  }


  getInviteLink(leagueId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${leagueId}/invite-link`);
  }

  joinLeagueByCode(inviteCode: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/join`, { inviteCode });
  }

  getLeagueByInviteCode(inviteCode: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/by-invite-code/${inviteCode}`);
  }

  getMyTeam(leagueId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${leagueId}/my-team`);
  }

  updateTeamCaptain(leagueId: string, playerId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${leagueId}/my-team/captain`, { playerId });
  }

  updateTeamFormation(leagueId: string, formation: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${leagueId}/my-team/formation`, { formation });
  }

  updateStartingEleven(leagueId: string, players: Player[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/${leagueId}/my-team/lineup`, { players });
  }

  // Nuevo método para guardar todos los cambios del equipo
  saveTeamChanges(leagueId: string, teamChanges: {
    formation: string;
    players: Player[];
    captainId?: string;
    viceCaptainId?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${leagueId}/my-team/save-changes`, teamChanges);
  }

  // Poner jugador a la venta
  listPlayerForSale(leagueId: string, playerId: string, askingPrice: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${leagueId}/market/sell`, { playerId, askingPrice });
  }

  // En create-league.service.ts
  getLeagueById(leagueId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${leagueId}`);
  }

  //Obtener liga sin leagueId (caso especial)
  getUserTeams(): Observable<any> {
    return this.http.get(`${this.apiUrl}/my-teams`);
  }

  deleteLeague(leagueId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${leagueId}`);
  }

  // En league.service.ts
  isLeagueAdmin(leagueId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${leagueId}/check-admin`);
  }


}
