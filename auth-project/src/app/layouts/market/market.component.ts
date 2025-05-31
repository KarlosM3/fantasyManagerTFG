import { Component, type OnInit } from "@angular/core"
import { MarketService } from "../../services/market.service"
import { ActiveLeagueService } from "../home/services/active-league.service"
import { LeagueService } from "../../modals/create-league-modal/services/create-league.service"
import { forkJoin } from "rxjs"
import { AuthService } from "../../auth/services/auth.service"
import { NotificationService } from "../../services/notification.service"

@Component({
  selector: "app-market",
  templateUrl: "./market.component.html",
  styleUrls: ["./market.component.scss"],
})

export class MarketComponent implements OnInit {
  players: any[] = []
  filteredPlayers: any[] = []
  myTeamPlayers: any[] = []
  activeLeagueId: string | null = null
  teamBudget = 0
  isLoading = true
  searchTerm = ""
  positionFilter = "all"
  sortOption = "marketValue"
  sortDirection: "asc" | "desc" = "desc"
  nextMarketUpdate: Date | null = null;
  userId: string = '';

  // Para la paginación
  currentPage = 1
  itemsPerPage = 10
  totalItems = 0

  // Propiedades para pujas
  bidAmount: number = 0;
  userBids: any[] = [];
  minBidAmount: number = 0;
  isProcessing: boolean = false;

  // Para el modal de compra/venta
  selectedPlayer: any = null
  showBuyModal = false
  showSellModal = false

  //Propiedades para ofertas
  listedPlayers: any[] = [];
  showOfferModal = false;
  selectedListing: any = null;
  offerAmount: number = 0;

  // Mapeo de posiciones
  positionMap: any = {
    "1": "Portero",
    "2": "Defensa",
    "3": "Centrocampista",
    "4": "Delantero",
  }

  constructor(
    private marketService: MarketService,
    private activeLeagueService: ActiveLeagueService,
    private leagueservice: LeagueService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.activeLeagueId = this.activeLeagueService.getActiveLeague();
    // Obtener el ID del usuario del servicio de autenticación
    this.userId = this.authService.getUserName();

    if (this.activeLeagueId) {
      this.loadData()
    } else {
      this.isLoading = false
    }
  }

  loadData(): void {
    this.isLoading = true;

    forkJoin({
      marketPlayers: this.marketService.getAllPlayers(this.activeLeagueId!),
      teamData: this.leagueservice.getMyTeam(this.activeLeagueId!),
      userBids: this.marketService.getUserBids(this.activeLeagueId!),
      listedPlayers: this.marketService.getListedPlayers(this.activeLeagueId!)
    }).subscribe({
      next: (results) => {
        this.players = results.marketPlayers.players;
        this.nextMarketUpdate = new Date(results.marketPlayers.nextMarketUpdate);
        this.myTeamPlayers = results.teamData.playersData || [];
        this.teamBudget = results.teamData.budget || 0;
        this.userBids = results.userBids || [];

        // Marcar jugadores que ya están en mi equipo o tienen pujas
        this.players = this.players.map((player) => {
          const existingBid = this.userBids.find(bid => bid.player.id === player.id);
          return {
            ...player,
            inMyTeam: this.myTeamPlayers.some((myPlayer) => myPlayer.id === player.id),
            currentBid: existingBid ? existingBid.amount : 0
          };
        });

        // Añadir jugadores en venta
        this.listedPlayers = results.listedPlayers;

        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error("Error cargando datos del mercado:", error);
        this.isLoading = false;
      },
    });
  }

  // Cargar pujas del usuario
  loadUserBids() {
    if (this.activeLeagueId) {
      this.marketService.getUserBids(this.activeLeagueId).subscribe({
        next: (bids) => {
          this.userBids = bids;

          // Actualizar las pujas actuales en la lista de jugadores
          this.players = this.players.map(player => {
            const existingBid = this.userBids.find(bid => bid.player.id === player.id);
            return {
              ...player,
              currentBid: existingBid ? existingBid.amount : player.currentBid || 0
            };
          });

          this.applyFilters();
        },
        error: (error) => {
          console.error('Error cargando pujas:', error);
        }
      });
    }
  }

  // Método para mostrar tiempo restante
  getTimeUntilNextUpdate(): string {
    if (!this.nextMarketUpdate) return '';

    const now = new Date();
    const diff = this.nextMarketUpdate.getTime() - now.getTime();

    if (diff <= 0) return 'Actualizando pronto...';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `Próxima actualización en ${hours}h ${minutes}m`;
  }

  applyFilters(): void {
    let result = [...this.players]

    // Aplicar filtro de búsqueda
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase()
      result = result.filter(
        (player) =>
          player.name?.toLowerCase().includes(term) ||
          player.nickname?.toLowerCase().includes(term) ||
          (player.team?.name && player.team.name.toLowerCase().includes(term)),
      )
    }

    // Aplicar filtro de posición
    if (this.positionFilter !== "all") {
      result = result.filter((player) => player.positionId === this.positionFilter)
    }

    // Aplicar ordenamiento
    result.sort((a, b) => {
      let valueA = a[this.sortOption]
      let valueB = b[this.sortOption]

      // Convertir a número si es un valor numérico
      if (this.sortOption === "marketValue" || this.sortOption === "points") {
        valueA = Number(valueA)
        valueB = Number(valueB)
      }

      if (this.sortDirection === "asc") {
        return valueA > valueB ? 1 : -1
      } else {
        return valueA < valueB ? 1 : -1
      }
    })

    this.totalItems = result.length
    this.filteredPlayers = result
  }

  onSearch(): void {
    this.currentPage = 1
    this.applyFilters()
  }

  onFilterChange(): void {
    this.currentPage = 1
    this.applyFilters()
  }

  onSortChange(option: string): void {
    if (this.sortOption === option) {
      // Cambiar dirección si es la misma opción
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc"
    } else {
      this.sortOption = option
      // Por defecto, ordenar descendente para valor de mercado y puntos
      this.sortDirection = option === "marketValue" || option === "points" ? "desc" : "asc"
    }
    this.applyFilters()
  }

  getSortIcon(column: string): string {
    if (this.sortOption !== column) return "sort"
    return this.sortDirection === "asc" ? "arrow_upward" : "arrow_downward"
  }

  openBuyModal(player: any): void {
    console.log('Abriendo modal para:', player.nickname);
    this.selectedPlayer = player;

    // Establecer puja mínima (valor de mercado o puja existente)
    const existingBid = this.userBids.find(bid => bid.player.id === player.id);
    if (existingBid) {
      this.bidAmount = existingBid.amount;
    } else {
      this.bidAmount = Number(player.marketValue);
    }

    this.minBidAmount = this.bidAmount;
    this.showBuyModal = true;
  }

  openSellModal(player: any): void {
    this.selectedPlayer = player
    this.showSellModal = true
  }

  openOfferModal(listing: any): void {
    this.selectedListing = listing;
    this.offerAmount = listing.askingPrice;
    this.showOfferModal = true;
  }

  closeBuyModal(): void {
    this.showBuyModal = false
    this.selectedPlayer = null
  }

  closeSellModal(): void {
    this.showSellModal = false
    this.selectedPlayer = null
  }

  closeOfferModal(): void {
    this.showOfferModal = false;
    this.selectedListing = null;
  }

  // Método para realizar una puja
  placeBid(): void {
    if (!this.selectedPlayer || !this.activeLeagueId) return;

    // Validar que la puja sea mayor o igual al mínimo
    if (this.bidAmount < this.minBidAmount) {
      this.showNotification(`La puja debe ser al menos ${this.formatMarketValue(this.minBidAmount)}`, 'warning');
      return;
    }

    // Validar que el usuario tenga suficiente presupuesto
    if (this.bidAmount > this.teamBudget) {
      this.showNotification('No tienes suficiente presupuesto para esta puja', 'error');
      return;
    }

    this.isProcessing = true;

    this.marketService.placeBid(this.selectedPlayer.id, this.activeLeagueId, this.bidAmount)
      .subscribe({
        next: (response) => {
          // Actualizar pujas locales
          this.loadUserBids();

          // Actualizar la puja en la lista de jugadores
          const playerIndex = this.players.findIndex(p => p.id === this.selectedPlayer.id);
          if (playerIndex >= 0) {
            this.players[playerIndex].currentBid = this.bidAmount;
          }

          // Cerrar modal y mostrar mensaje de éxito
          this.showBuyModal = false;
          this.showNotification('Puja realizada con éxito', 'success');
          this.isProcessing = false;
        },
        error: (error) => {
          console.error('Error al realizar puja:', error);
          this.showNotification(error.error?.message || 'Error al procesar la puja', 'error');
          this.isProcessing = false;
        }
      });
  }


  // Método antiguo (mantener por compatibilidad)
  buyPlayer(): void {
    // Redirigir al nuevo método de pujas
    this.placeBid();
  }

  sellPlayer(): void {
    if (!this.selectedPlayer || !this.activeLeagueId) return

    this.marketService.sellPlayer(this.activeLeagueId, this.selectedPlayer.id).subscribe({
      next: (response) => {
        this.teamBudget = response.newBudget
        this.closeSellModal()
        this.loadData() // Recargar datos
      },
      error: (error) => {
        console.error("Error al vender jugador:", error)
        this.showErrorMessage(error.error?.message || 'Error al vender el jugador');
      },
    })
  }

  // Método para hacer una oferta
  makeOffer(): void {
    if (!this.selectedListing || !this.activeLeagueId) return;

    // Validar que la oferta sea mayor o igual al precio pedido
    if (this.offerAmount < this.selectedListing.askingPrice) {
      this.showNotification(`La oferta debe ser al menos ${this.formatMarketValue(this.selectedListing.askingPrice)}`, 'warning');
      return;
    }

    // Validar que el usuario tenga suficiente presupuesto
    if (this.offerAmount > this.teamBudget) {
      this.showNotification('No tienes suficiente presupuesto para esta oferta', 'error');
      return;
    }

    this.isProcessing = true;

    this.marketService.makeOffer(this.selectedListing._id, this.offerAmount)
      .subscribe({
        next: (response) => {
          // Recargar datos
          this.loadData();

          // Cerrar modal y mostrar mensaje de éxito
          this.showOfferModal = false;
          this.showNotification('Oferta realizada con éxito', 'success');
          this.isProcessing = false;
        },
        error: (error) => {
          console.error('Error al realizar oferta:', error);
          this.showNotification(error.error?.message || 'Error al procesar la oferta', 'error');
          this.isProcessing = false;
        }
      });
  }

  // Helpers para la paginación
  get paginatedPlayers(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage
    return this.filteredPlayers.slice(startIndex, startIndex + this.itemsPerPage)
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage)
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page
    }
  }

  // Formatear valor de mercado
  formatMarketValue(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M €`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K €`
    }
    return `${value} €`
  }

  // Obtener color según posición
  getPositionColor(positionId: string): string {
    const colors: { [key: string]: string } = {
      "1": "#FFC107", // Portero - Amarillo
      "2": "#F44336", // Defensa - Verde
      "3": "#2196F3", // Centrocampista - Azul
      "4": "#4CAF50", // Delantero - Rojo
    }
    return colors[positionId] || "#9E9E9E"
  }



  showSuccessMessage(message: string): void {
    this.notificationService.showSuccess(message);
  }

  showErrorMessage(message: string): void {
    this.notificationService.showError(message);
  }

  // Reemplazar el método showNotification existente
  showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
  switch(type) {
    case 'success':
      this.notificationService.showSuccess(message);
      break;
    case 'error':
      this.notificationService.showError(message);
      break;
    case 'warning':
      this.notificationService.showWarning(message);
      break;
    case 'info':
      this.notificationService.showInfo(message);
      break;
  }
}



}
