import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

  assignRandomTeam(leagueId: string): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}/${leagueId}/assign-random-team`, {});
  }

  getLeagueClassification(leagueId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${leagueId}/classification`);
  }

  getInviteLink(leagueId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${leagueId}/invite-link`);
  }

  joinLeagueByCode(inviteCode: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/join`, { inviteCode });
  }

}
