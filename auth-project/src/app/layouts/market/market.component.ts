import { Component, type OnInit } from "@angular/core"
import { MarketService } from "../../services/market.service"
import { ActiveLeagueService } from "../home/services/active-league.service"
import { LeagueService } from "../../modals/create-league-modal/services/create-league.service"
import { forkJoin } from "rxjs"

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

  // Para la paginación
  currentPage = 1
  itemsPerPage = 10
  totalItems = 0

  // Para el modal de compra/venta
  selectedPlayer: any = null
  showBuyModal = false
  showSellModal = false

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
  ) {}

  ngOnInit(): void {
    this.activeLeagueId = this.activeLeagueService.getActiveLeague()
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
    teamData: this.leagueservice.getMyTeam(this.activeLeagueId!)
  }).subscribe({
    next: (results) => {
      this.players = results.marketPlayers.players;
      this.nextMarketUpdate = new Date(results.marketPlayers.nextMarketUpdate);
      // Falta asignar estos valores:
      this.myTeamPlayers = results.teamData.playersData || [];
      this.teamBudget = results.teamData.budget || 0;

      // Marcar jugadores que ya están en el equipo
      this.players = this.players.map((player) => ({
        ...player,
        inMyTeam: this.myTeamPlayers.some((myPlayer) => myPlayer.id === player.id),
      }));

      this.applyFilters();
      this.isLoading = false;
    },
    error: (error) => {
      console.error("Error cargando datos del mercado:", error);
      this.isLoading = false;
    },
  });
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
          player.name.toLowerCase().includes(term) ||
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
    this.selectedPlayer = player
    this.showBuyModal = true
  }

  openSellModal(player: any): void {
    this.selectedPlayer = player
    this.showSellModal = true
  }

  closeBuyModal(): void {
    this.showBuyModal = false
    this.selectedPlayer = null
  }

  closeSellModal(): void {
    this.showSellModal = false
    this.selectedPlayer = null
  }

  buyPlayer(): void {
    if (!this.selectedPlayer || !this.activeLeagueId) return

    this.marketService.buyPlayer(this.activeLeagueId, this.selectedPlayer.id).subscribe({
      next: (response) => {
        this.teamBudget = response.newBudget
        this.closeBuyModal()
        this.loadData() // Recargar datos
      },
      error: (error) => {
        console.error("Error al comprar jugador:", error)
        // Aquí podrías mostrar un mensaje de error
      },
    })
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
        // Aquí podrías mostrar un mensaje de error
      },
    })
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
      "2": "#4CAF50", // Defensa - Verde
      "3": "#2196F3", // Centrocampista - Azul
      "4": "#F44336", // Delantero - Rojo
    }
    return colors[positionId] || "#9E9E9E"
  }
}
