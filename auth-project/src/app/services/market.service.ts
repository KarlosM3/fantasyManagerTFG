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

  // Realizar una puja por un jugador
  placeBid(playerId: string, leagueId: string, amount: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/bid`, { playerId, leagueId, amount });
  }

  // Obtener pujas del usuario actual
  getUserBids(leagueId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/bids/${leagueId}`);
  }

  // Obtener jugadores puestos a la venta
  getListedPlayers(leagueId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/listings?leagueId=${leagueId}`);
  }

  // Hacer una oferta por un jugador
  makeOffer(listingId: string, amount: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/offer`, { listingId, amount });
  }

  // Aceptar una oferta
  acceptOffer(offerId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/accept-offer`, { offerId });
  }

  // Obtener ofertas recibidas
  getReceivedOffers(leagueId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/received-offers?leagueId=${leagueId}`);
  }

  // Rechazar una oferta
  rejectOffer(offerId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reject-offer`, { offerId });
  }

}
