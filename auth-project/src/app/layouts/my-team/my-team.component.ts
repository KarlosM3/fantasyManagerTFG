import { Component, type OnInit } from "@angular/core"
import { ActivatedRoute } from "@angular/router"
import { LeagueService } from "../../modals/create-league-modal/services/create-league.service"
import { Player } from "../../player.interface"
import { FormationService } from "../../services/formation.service"
import { PlayerBadgeService } from "../../services/player-badge.service"
import { PlaceholderPlayerService } from "../../services/placeholder-player.service"

@Component({
  selector: "app-my-team",
  templateUrl: "./my-team.component.html",
  styleUrls: ["./my-team.component.scss"],
})
export class MyTeamComponent implements OnInit {
  leagueId = ""
  players: Player[] = []
  startingGoalkeeper: Player[] = []
  startingDefenders: Player[] = []
  startingMidfielders: Player[] = []
  startingForwards: Player[] = []
  benchPlayers: Player[] = []
  goalkeepers: Player[] = []
  defenders: Player[] = []
  midfielders: Player[] = []
  forwards: Player[] = []

  // Formaciones válidas para fútbol (siempre suman 10 jugadores de campo)
  validFormations: string[] = ["4-4-2", "4-3-3", "3-5-2", "5-3-2", "5-4-1", "3-4-3"]
  currentFormation = "4-4-2"
  totalPoints = 0
  teamValue = 0
  availableBudget = 0

  // Propiedades para venta
  playerToSell: Player | null = null;
  askingPrice: number = 0;
  minAskingPrice: number = 0;
  sellModeMessage: string = "";

  // Estado para modales
  showFormationModal = false
  showSellModal: boolean = false;
  sellMode: boolean = false;

  // Estado para banquillo
  showBench = false

  // Estado para intercambio de jugadores
  exchangeMode = false
  playerToExchange: Player | null = null
  exchangeModeMessage = ""
  selectedPlayer: Player | null = null

  // Estado para drag and drop
  draggedPlayer: Player | null = null
  dropTarget = ""

  // Mapeo de posiciones de la API a nuestras categorías
  private positionMap = {
    "1": "GK",
    "2": "DEF",
    "3": "MID",
    "4": "FWD",
  }

  constructor(
    private route: ActivatedRoute,
    private leagueService: LeagueService,
    private formationService: FormationService,
    private playerBadgeService: PlayerBadgeService,
    private placeholderService: PlaceholderPlayerService, // Añadir este servicio
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.leagueId = params["leagueId"]
      this.loadTeam()
    })
  }

  loadTeam(): void {
    this.leagueService.getMyTeam(this.leagueId).subscribe({
      next: (response: any) => {
        // Verifica si la respuesta es un array o un objeto con una propiedad que contiene el array
        const data = Array.isArray(response.playersData) ? response.playersData : (response.team?.playersData || []);

        this.availableBudget = response.budget || 0
        this.players = data.map((player: any) => ({
          ...player,
          position: this.positionMap[player.positionId as keyof typeof this.positionMap],
          image: player.images?.transparent?.["256x256"] || null,
          // Asegurarse de que el escudo del equipo esté disponible
          team: {
            ...player.team,
            badgeColor: player.team?.badgeColor || null,
          },
        }));

        // Cargar formación guardada
        this.currentFormation = response.team?.formation || '4-4-2';

        this.filterPlayersByPosition();
        this.applyFormationWithPlaceholders();
        this.calculateTeamStats();

        // Restaurar capitán y vicecapitán si existen
        if (response.team?.captain) {
          const captain = this.players.find(p => p.id === response.team.captain);
          if (captain) {
            this.setCaptainSilently(captain);
          }
        }

        if (response.team?.viceCaptain) {
          const viceCaptain = this.players.find(p => p.id === response.team.viceCaptain);
          if (viceCaptain) {
            this.setViceCaptainSilently(viceCaptain);
          }
        }

        // Restaurar alineación si existe
        if (response.team?.startingEleven && response.team.startingEleven.length > 0) {
          this.restoreStartingEleven(response.team.startingEleven);
        }
      },
      error: (error) => {
        console.error("Error loading team:", error);
        this.showErrorMessage("Error al cargar el equipo");
      },
    });
  }

  // Método auxiliar para establecer capitán sin hacer llamadas al servidor
  private setCaptainSilently(player: Player): void {
    // Quitar capitán anterior
    this.players.forEach((p) => (p.isCaptain = false));
    player.isCaptain = true;
  }

  // Método auxiliar para establecer vicecapitán sin hacer llamadas al servidor
  private setViceCaptainSilently(player: Player): void {
    // Quitar vice-capitán anterior
    this.players.forEach((p) => (p.isViceCaptain = false));
    player.isViceCaptain = true;
  }

  // Método para restaurar la alineación guardada
  private restoreStartingEleven(startingEleven: any[]): void {
    // Identificar jugadores por posición
    const starters = {
      GK: startingEleven.filter(p => p.position === 'GK' || this.positionMap[p.positionId as keyof typeof this.positionMap] === 'GK'),
      DEF: startingEleven.filter(p => p.position === 'DEF' || this.positionMap[p.positionId as keyof typeof this.positionMap] === 'DEF'),
      MID: startingEleven.filter(p => p.position === 'MID' || this.positionMap[p.positionId as keyof typeof this.positionMap] === 'MID'),
      FWD: startingEleven.filter(p => p.position === 'FWD' || this.positionMap[p.positionId as keyof typeof this.positionMap] === 'FWD')
    };

    // Reconstruir alineación con jugadores actuales
    const formationParts = this.currentFormation.split('-').map(part => Number.parseInt(part));

    // Portero
    if (starters.GK.length > 0) {
      const gkIds = starters.GK.map(p => p.id);
      this.startingGoalkeeper = this.goalkeepers.filter(p => gkIds.includes(p.id));

      // Completar con placeholders si es necesario
      if (this.startingGoalkeeper.length < 1) {
        this.startingGoalkeeper.push(this.placeholderService.getPlaceholder('GK', 0));
      }
    }

    // Defensas
    const defCount = formationParts[0];
    if (starters.DEF.length > 0) {
      const defIds = starters.DEF.map(p => p.id);
      this.startingDefenders = this.defenders.filter(p => defIds.includes(p.id));

      // Completar con placeholders si es necesario
      while (this.startingDefenders.length < defCount) {
        this.startingDefenders.push(this.placeholderService.getPlaceholder('DEF', this.startingDefenders.length));
      }
    }

    // Centrocampistas
    const midCount = formationParts[1];
    if (starters.MID.length > 0) {
      const midIds = starters.MID.map(p => p.id);
      this.startingMidfielders = this.midfielders.filter(p => midIds.includes(p.id));

      // Completar con placeholders si es necesario
      while (this.startingMidfielders.length < midCount) {
        this.startingMidfielders.push(this.placeholderService.getPlaceholder('MID', this.startingMidfielders.length));
      }
    }

    // Delanteros
    const fwdCount = formationParts[2];
    if (starters.FWD.length > 0) {
      const fwdIds = starters.FWD.map(p => p.id);
      this.startingForwards = this.forwards.filter(p => fwdIds.includes(p.id));

      // Completar con placeholders si es necesario
      while (this.startingForwards.length < fwdCount) {
        this.startingForwards.push(this.placeholderService.getPlaceholder('FWD', this.startingForwards.length));
      }
    }

    // Actualizar banquillo
    this.benchPlayers = [
      ...this.goalkeepers.filter(p => !this.startingGoalkeeper.map(s => s.id).includes(p.id)),
      ...this.defenders.filter(p => !this.startingDefenders.map(s => s.id).includes(p.id)),
      ...this.midfielders.filter(p => !this.startingMidfielders.map(s => s.id).includes(p.id)),
      ...this.forwards.filter(p => !this.startingForwards.map(s => s.id).includes(p.id))
    ];
  }

  // Encuentra la formación válida más cercana
  findClosestValidFormation(def: number, mid: number, fwd: number): string {
    // Por defecto, usar 4-4-2 si no hay suficientes jugadores
    if (def < 3 || mid < 3 || fwd < 1) return "4-4-2"

    // Buscar la formación válida que minimice los cambios
    let bestFormation = "4-4-2"
    let minDifference = 100

    for (const formation of this.validFormations) {
      const parts = formation.split("-").map((p) => Number.parseInt(p))
      const difference = Math.abs(parts[0] - def) + Math.abs(parts[1] - mid) + Math.abs(parts[2] - fwd)

      if (difference < minDifference) {
        minDifference = difference
        bestFormation = formation
      }
    }

    return bestFormation
  }

  // Función para seleccionar los 11 titulares según la formación
  selectStartingEleven(): void {
    this.applyFormationWithPlaceholders()
  }

  filterPlayersByPosition(): void {
    this.goalkeepers = this.players.filter((p) => p.position === "GK")
    this.defenders = this.players.filter((p) => p.position === "DEF")
    this.midfielders = this.players.filter((p) => p.position === "MID")
    this.forwards = this.players.filter((p) => p.position === "FWD")
  }

  calculateTeamStats(): void {
    this.totalPoints = this.players.reduce((sum, player) => sum + (player.points || 0), 0)
    // Asumiendo que el valor del jugador está en otra propiedad, ajusta según corresponda
    this.teamValue = this.players.reduce((sum, player) => {
      // Usa la propiedad correcta según tu API
      const value = player.marketValue || 0
      return sum + Number(value)
    }, 0)
  }

  setCaptain(player: Player): void {
    // Quitar capitán anterior
    this.players.forEach((p) => (p.isCaptain = false))
    player.isCaptain = true
    // Actualizar en el servidor
    this.leagueService.updateTeamCaptain(this.leagueId, player.id).subscribe({
      next: () => {
        console.log("Capitán actualizado con éxito")
      },
      error: (error) => {
        console.error("Error al actualizar capitán:", error)
        // Revertir cambio en caso de error
        player.isCaptain = false
      },
    })
  }

  setViceCaptain(player: Player): void {
    // Quitar vice-capitán anterior
    this.players.forEach((p) => (p.isViceCaptain = false))
    player.isViceCaptain = true
    // Aquí se implementaría la llamada al servicio para actualizar en el servidor
  }

  openFormationModal(): void {
    this.showFormationModal = true
  }

  closeFormationModal(): void {
    this.showFormationModal = false
  }

  // Propiedades para mensajes de error
  formationErrorMessage = ""
  showFormationErrorMessage = false

  changeFormation(formation: string): void {
    if (!this.validFormations.includes(formation)) {
      this.showFormationError("Formación no válida")
      return
    }

    // Verificar si tenemos suficientes jugadores para esta formación
    const parts = formation.split("-").map((p) => Number.parseInt(p))
    const [defNeeded, midNeeded, fwdNeeded] = parts

    const defAvailable = this.defenders.length
    const midAvailable = this.midfielders.length
    const fwdAvailable = this.forwards.length

    // Mostrar advertencias pero permitir el cambio con placeholders
    let warningMessage = ""

    if (defAvailable < defNeeded) {
      warningMessage += `Faltan ${defNeeded - defAvailable} defensas. `
    }

    if (midAvailable < midNeeded) {
      warningMessage += `Faltan ${midNeeded - midAvailable} centrocampistas. `
    }

    if (fwdAvailable < fwdNeeded) {
      warningMessage += `Faltan ${fwdNeeded - fwdAvailable} delanteros. `
    }

    // Si hay advertencias, mostrarlas pero continuar
    if (warningMessage) {
      this.showFormationWarning(warningMessage + "Se usarán posiciones vacantes.")
    }

    // Aplicar la formación de todos modos
    this.currentFormation = formation
    this.applyFormationWithPlaceholders()

    // Actualizar en el servidor
    this.leagueService.updateTeamFormation(this.leagueId, formation).subscribe({
      next: () => {
        console.log("Formación actualizada con éxito")
        this.closeFormationModal()
      },
      error: (error) => {
        console.error("Error al actualizar formación:", error)
      },
    })
  }

  // Añadir este nuevo método para aplicar formación con placeholders
  applyFormationWithPlaceholders(): void {
    // Extraer números de la formación (ej: "4-4-2" -> [4,4,2])
    const formationParts = this.currentFormation.split("-").map((part) => Number.parseInt(part))

    // Seleccionar 1 portero (siempre 1 en fútbol)
    this.startingGoalkeeper =
      this.goalkeepers.length > 0 ? [this.goalkeepers[0]] : [this.placeholderService.getPlaceholder("GK", 0)]

    // Seleccionar defensas según el primer número de la formación
    const defCount = formationParts[0]
    this.startingDefenders = [...this.defenders.slice(0, defCount)]

    // Añadir placeholders si faltan defensas
    if (this.startingDefenders.length < defCount) {
      for (let i = this.startingDefenders.length; i < defCount; i++) {
        this.startingDefenders.push(this.placeholderService.getPlaceholder("DEF", i))
      }
    }

    // Seleccionar mediocampistas según el segundo número
    const midCount = formationParts[1]
    this.startingMidfielders = [...this.midfielders.slice(0, midCount)]

    // Añadir placeholders si faltan mediocampistas
    if (this.startingMidfielders.length < midCount) {
      for (let i = this.startingMidfielders.length; i < midCount; i++) {
        this.startingMidfielders.push(this.placeholderService.getPlaceholder("MID", i))
      }
    }

    // Seleccionar delanteros según el tercer número
    const fwdCount = formationParts[2]
    this.startingForwards = [...this.forwards.slice(0, fwdCount)]

    // Añadir placeholders si faltan delanteros
    if (this.startingForwards.length < fwdCount) {
      for (let i = this.startingForwards.length; i < fwdCount; i++) {
        this.startingForwards.push(this.placeholderService.getPlaceholder("FWD", i))
      }
    }

    // Calcular jugadores del banquillo (todos los que no son titulares ni placeholders)
    this.benchPlayers = [
      ...this.goalkeepers.slice(1),
      ...this.defenders.slice(defCount),
      ...this.midfielders.slice(midCount),
      ...this.forwards.slice(fwdCount),
    ]
  }

  // Añadir este método para mostrar advertencias
  showFormationWarning(message: string): void {
    this.formationErrorMessage = message
    this.showFormationErrorMessage = true

    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
      this.showFormationErrorMessage = false
    }, 5000)
  }

  // Método para mostrar errores de formación
  showFormationError(message: string): void {
    this.formationErrorMessage = message
    this.showFormationErrorMessage = true

    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
      this.showFormationErrorMessage = false
    }, 5000)

    // Sugerir formación alternativa
    const suggestedFormation = this.findClosestValidFormation(
      this.defenders.length,
      this.midfielders.length,
      this.forwards.length,
    )

    if (suggestedFormation) {
      this.formationErrorMessage += `. Formación sugerida: ${suggestedFormation}`
    }
  }

  // Abrir modal de venta
  openSellModal(player: Player): void {
    this.playerToSell = player;
    this.minAskingPrice = Number(player.marketValue);
    this.askingPrice = this.minAskingPrice;
    this.showSellModal = true;
  }

  initiateSellMode(): void {
    this.sellMode = true;
    this.sellModeMessage = "Selecciona el jugador que deseas vender";
    // Cancelar cualquier otro modo activo
    this.exchangeMode = false;
    this.playerToExchange = null;
  }

  closeSellModal(): void {
    this.showSellModal = false;
    this.playerToSell = null;
  }

  //Poner jugador en venta
  listPlayerForSale(): void {
    if (!this.playerToSell || !this.leagueId) return;

    // Validar que el precio sea al menos el valor de mercado
    if (this.askingPrice < this.minAskingPrice) {
      this.showErrorMessage(`El precio debe ser al menos ${this.formatCurrency(this.minAskingPrice)}`);
      return;
    }

    this.leagueService.listPlayerForSale(this.leagueId, this.playerToSell.id, this.askingPrice)
      .subscribe({
        next: (response) => {
          this.showSuccessMessage('Jugador puesto a la venta con éxito');
          this.closeSellModal();
          this.loadTeam(); // Recargar datos
        },
        error: (error) => {
          console.error('Error al poner jugador a la venta:', error);
          this.showErrorMessage(error.error?.message || 'Error al procesar la venta');
        }
      });
  }

  // Funciones para controlar el banquillo
  toggleBench(): void {
    this.showBench = !this.showBench
  }

  // Funciones para intercambio de jugadores
  selectPlayer(player: Player): void {
    if (this.exchangeMode) {
      if (this.isCompatibleExchange(player)) {
        this.completeExchange(player);
      }
      return;
    }
    // Si el modo de venta está activo, abrir el modal de venta
    if (this.sellMode) {
      if (!this.isPlaceholderPlayer(player)) {
        this.openSellModal(player);
        this.sellMode = false;
        this.sellModeMessage = "";
      }
      return;
    }

    this.selectedPlayer = player;
  }


  initiateExchange(player: Player): void {
    this.playerToExchange = player
    this.exchangeMode = true
    this.selectedPlayer = player

    // Mostrar un mensaje según la posición del jugador
    const positionName = this.getReadablePosition(player.position ?? "")
    this.exchangeModeMessage = `Selecciona un ${positionName} del banquillo para reemplazar a ${player.nickname}`

    // Asegurar que el banquillo está visible
    this.showBench = true
  }

  isCompatibleExchange(benchPlayer: Player): boolean {
    if (!this.playerToExchange || !this.exchangeMode) {
      return false
    }

    // Comprobar si las posiciones son compatibles
    return benchPlayer.position === this.playerToExchange.position
  }

  completeExchange(benchPlayer: Player): void {
    if (!this.playerToExchange || !this.isCompatibleExchange(benchPlayer)) {
      return;
    }

    // Obtener arrays para realizar el intercambio
    const { starter, starters, index } = this.getPlayerArrays(this.playerToExchange);
    if (starter && starters && index >= 0) {
      // Guardar el capitán/vice-capitán
      const isCaptain = starter.isCaptain;
      const isViceCaptain = starter.isViceCaptain;

      // Transferir capitán/vice-capitán si es necesario
      benchPlayer.isCaptain = isCaptain;
      benchPlayer.isViceCaptain = isViceCaptain;

      // Intercambiar jugadores
      starters[index] = benchPlayer;

      // Reemplazar en el banquillo
      const benchIndex = this.benchPlayers.findIndex((p) => p.id === benchPlayer.id);
      if (benchIndex >= 0) {
        this.benchPlayers[benchIndex] = starter;
      }

      // Cancelar el modo de intercambio
      this.exchangeMode = false;
      this.playerToExchange = null;
      this.selectedPlayer = null;
      this.exchangeModeMessage = "";
    }
  }

  cancelExchange(): void {
    this.exchangeMode = false
    this.playerToExchange = null
    this.selectedPlayer = null
    this.exchangeModeMessage = ""
  }

  getReadablePosition(position: string): string {
    const positions: { [key: string]: string } = {
      GK: "portero",
      DEF: "defensa",
      MID: "centrocampista",
      FWD: "delantero",
    }
    return positions[position] || "jugador"
  }

  private getPlayerArrays(player: Player): { starter: Player; starters: Player[]; index: number } {
    let starters: Player[] = []
    let index = -1

    // Determinar el array según la posición
    if (player.position === "GK") {
      starters = this.startingGoalkeeper
      index = this.startingGoalkeeper.findIndex((p) => p.id === player.id)
    } else if (player.position === "DEF") {
      starters = this.startingDefenders
      index = this.startingDefenders.findIndex((p) => p.id === player.id)
    } else if (player.position === "MID") {
      starters = this.startingMidfielders
      index = this.startingMidfielders.findIndex((p) => p.id === player.id)
    } else if (player.position === "FWD") {
      starters = this.startingForwards
      index = this.startingForwards.findIndex((p) => p.id === player.id)
    }

    return { starter: player, starters, index }
  }

  getPlayerPositionClass(player: Player): string {
    if (player.isCaptain) return "captain"
    if (player.isViceCaptain) return "vice-captain"
    return ""
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value)
  }

  getPlayerStatus(player: Player): string {
    return this.playerBadgeService.getPlayerStatus(player)
  }

  getStatusClass(player: Player): string {
    const status = this.getPlayerStatus(player)
    return this.playerBadgeService.getStatusClass(status)
  }

  getStatusColor(player: Player): string {
    const status = this.getPlayerStatus(player)
    return this.playerBadgeService.getStatusColor(status)
  }

  // Añadir este método para verificar si un jugador es un placeholder
  isPlaceholderPlayer(player: Player): boolean {
    return this.placeholderService.isPlaceholder(player)
  }

  saveTeamChanges(): void {
    // Recopilar todos los jugadores del 11 inicial, excluyendo los placeholders
    const startingEleven = [
      ...this.startingGoalkeeper,
      ...this.startingDefenders,
      ...this.startingMidfielders,
      ...this.startingForwards
    ].filter(player => !this.isPlaceholderPlayer(player));

    // Encontrar capitán y vicecapitán
    const captainPlayer = this.players.find(p => p.isCaptain);
    const viceCaptainPlayer = this.players.find(p => p.isViceCaptain);

    // Crear objeto con todos los cambios
    const teamChanges = {
      formation: this.currentFormation,
      players: startingEleven,
      captainId: captainPlayer?.id,
      viceCaptainId: viceCaptainPlayer?.id
    };

    // Enviar al servidor
    this.leagueService.saveTeamChanges(this.leagueId, teamChanges)
      .subscribe({
        next: (response) => {
          console.log("Cambios guardados con éxito");
          // Mostrar notificación de éxito
          this.showSuccessMessage("Cambios guardados correctamente");
        },
        error: (error) => {
          console.error("Error al guardar los cambios:", error);
          // Mostrar notificación de error
          this.showErrorMessage("Error al guardar los cambios");
        }
      });
  }

  // Método auxiliar para mostrar mensaje de éxito
  private showSuccessMessage(message: string): void {
    // Implementar lógica para mostrar notificación
    // Por ejemplo, podrías usar un servicio de notificaciones o un simple alert
    alert(message);
  }

  // Método auxiliar para mostrar mensaje de error
  private showErrorMessage(message: string): void {
    // Implementar lógica para mostrar notificación de error
    alert(message);
  }
}
