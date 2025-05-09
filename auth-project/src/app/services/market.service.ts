import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { Observable } from "rxjs"

@Injectable({
  providedIn: "root",
})
export class MarketService {
  private apiUrl = 'http://localhost:3000/api/market';

  constructor(private http: HttpClient) {}

  // Obtener todos los jugadores del mercado
  getAllPlayers(leagueId: string): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}/players?leagueId=${leagueId}`);
}

  // Comprar un jugador
  buyPlayer(leagueId: string, playerId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/buy`, { leagueId, playerId })
  }

  // Vender un jugador
  sellPlayer(leagueId: string, playerId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/sell`, { leagueId, playerId })
  }

  // Obtener historial de transacciones
  getTransactionHistory(leagueId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/transactions/${leagueId}`)
  }
}
