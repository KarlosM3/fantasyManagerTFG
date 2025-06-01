import { Component, type OnInit } from "@angular/core"
import { ActivatedRoute, Router } from "@angular/router"
import { LeagueService } from "../../modals/create-league-modal/services/create-league.service"
import { Player } from "../../player.interface"
import { FormationService } from "../../services/formation.service"
import { PlayerBadgeService } from "../../services/player-badge.service"
import { PlaceholderPlayerService } from "../../services/placeholder-player.service"
import { PointsService } from "../../services/points.service"
import { ActiveLeagueService } from "../home/services/active-league.service"
import { NotificationService } from "../../services/notification.service"
import { TeamFormationService } from "../../services/team-formation.service"

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
  ligaActivaId: string | null = null;

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

  // Propiedades para jornada
  currentMatchday!: number;
  matchdayStarted: boolean = false;
  matchdayEnded: boolean = false;
  matchdayLocked: boolean = false;
  matchdayStatusMessage: string = "";

  // Mapeo de posiciones de la API a nuestras categorías
  private positionMap = {
    "1": "GK",
    "2": "DEF",
    "3": "MID",
    "4": "FWD",
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private leagueService: LeagueService,
    private formationService: FormationService,
    public playerBadgeService: PlayerBadgeService,
    private pointsService: PointsService,
    private activeLeagueService: ActiveLeagueService,
    private notificationService: NotificationService,
    private placeholderService: PlaceholderPlayerService, // Añadir este servicio
    private teamFormationService: TeamFormationService, // Añadir este servicio
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.leagueId = params["leagueId"];

      if (!this.leagueId) {
        // Primero verificar si hay una liga activa en el servicio
        const activeLiga = this.activeLeagueService.getActiveLeague();

        if (activeLiga) {
          // Si hay una liga activa, usar esa
          this.leagueId = activeLiga;
          this.loadTeam();
          this.checkMatchdayStatus();
        } else {
          // Si no hay liga activa, intentar obtener el equipo más reciente
          this.leagueService.getUserTeams().subscribe({
            next: (response: any) => {
              if (response && response.teams && response.teams.length > 0) {
                this.leagueId = response.teams[0].leagueId;
                this.loadTeam();
                this.checkMatchdayStatus();
              } else {
                this.showErrorMessage("No tienes ningún equipo. Por favor, únete a una liga desde la página 'Mis Ligas'.");
              }
            },
            error: (error) => {
              console.error("Error al obtener equipos del usuario:", error);
              this.showErrorMessage("Error al cargar tus equipos");
            }
          });
        }
      } else {
        // Si hay leagueId en la URL, usarlo y actualizar la liga activa
        this.activeLeagueService.setActiveLeague(this.leagueId);
        this.loadTeam();
        this.checkMatchdayStatus();
      }

       // Actualizar la propiedad ligaActivaId para el menú lateral
      this.ligaActivaId = this.activeLeagueService.getActiveLeague();
    });

      this.teamFormationService.clearTemporaryFormation();

    // Verificar el estado de la jornada cada 5 minutos
    setInterval(() => {
      if (this.leagueId) {
        this.checkMatchdayStatus();
      }
    }, 5 * 60 * 1000);

    // VERIFICAR si venimos de team-points y limpiar estado
    this.route.queryParams.subscribe(params => {
      if (params['fromTeamPoints']) {
        // Limpiar formación temporal si venimos de team-points
        this.teamFormationService.clearTemporaryFormation();
        // Recargar datos limpios
        this.loadTeam();
      }
    });
  }




  // Método para verificar el estado de la jornada
  checkMatchdayStatus(): void {
    // Obtener la jornada actual
    this.pointsService.getCurrentMatchday().subscribe(
      (data: any) => {
        this.currentMatchday = data.data.matchday;

        // Verificar si la jornada ha comenzado
        this.pointsService.hasMatchdayStarted(this.currentMatchday).subscribe(
          (startData: any) => {
            this.matchdayStarted = startData.data.hasStarted;

            // Si la jornada ha comenzado, verificar si ha terminado
            if (this.matchdayStarted) {
              this.pointsService.hasMatchdayEnded(this.currentMatchday).subscribe(
                (endData: any) => {
                  this.matchdayEnded = endData.data.hasEnded;

                  // Actualizar el estado de bloqueo
                  // Solo bloqueamos si la jornada ha comenzado pero no ha terminado
                  this.matchdayLocked = this.matchdayStarted && !this.matchdayEnded;

                  // Actualizar el mensaje de estado
                  this.updateMatchdayStatusMessage();

                  console.log(`Jornada ${this.currentMatchday}: Comenzada=${this.matchdayStarted}, Terminada=${this.matchdayEnded}, Bloqueada=${this.matchdayLocked}`);
                  console.log(`Porcentaje de jugadores con puntos: ${endData.data.completionPercentage.toFixed(2)}%`);
                },
                (error: any) => {
                  console.error('Error al verificar si la jornada ha terminado:', error);
                }
              );
            } else {
              this.matchdayLocked = false;
              this.matchdayEnded = false;
              this.updateMatchdayStatusMessage();
            }
          },
          (error: any) => {
            console.error('Error al verificar si la jornada ha comenzado:', error);
          }
        );
      },
      (error: any) => {
        console.error('Error al obtener la jornada actual:', error);
      }
    );
  }

  // Método para actualizar el mensaje de estado de la jornada
  updateMatchdayStatusMessage(): void {
    if (this.matchdayStarted && !this.matchdayEnded) {
      this.matchdayStatusMessage = `Jornada ${this.currentMatchday} en curso - Cambios bloqueados`;
    } else if (this.matchdayEnded) {
      this.matchdayStatusMessage = `Jornada ${this.currentMatchday} finalizada - Cambios permitidos`;
    } else {
      this.matchdayStatusMessage = `Jornada ${this.currentMatchday} no iniciada - Cambios permitidos`;
    }
  }

  // Método para verificar si se pueden realizar cambios
  canMakeChanges(): boolean {
    return !this.matchdayLocked;
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
      console.log('Jugadores filtrados por posición:', {
      goalkeepers: this.goalkeepers.length,
      defenders: this.defenders.length,
      midfielders: this.midfielders.length,
      forwards: this.forwards.length,
      forwardNames: this.forwards.map(f => f.nickname)
    });
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
    // Limpiar arrays antes de aplicar formación
    this.startingGoalkeeper = [];
    this.startingDefenders = [];
    this.startingMidfielders = [];
    this.startingForwards = [];

    const formationParts = this.currentFormation.split("-").map((part) => Number.parseInt(part));
    const [defCount, midCount, fwdCount] = formationParts;

    console.log(`Aplicando formación ${this.currentFormation}: ${defCount} DEF, ${midCount} MID, ${fwdCount} FWD`);

    // PORTEROS
    this.startingGoalkeeper = this.goalkeepers.length > 0
      ? [this.goalkeepers[0]]
      : [this.placeholderService.getPlaceholder("GK", 0)];

    // DEFENSAS - Usar todos los defensas disponibles
    this.startingDefenders = [...this.defenders.slice(0, defCount)];
    while (this.startingDefenders.length < defCount) {
      this.startingDefenders.push(this.placeholderService.getPlaceholder("DEF", this.startingDefenders.length));
    }

    // CENTROCAMPISTAS - Usar todos los centrocampistas disponibles
    this.startingMidfielders = [...this.midfielders.slice(0, midCount)];
    while (this.startingMidfielders.length < midCount) {
      this.startingMidfielders.push(this.placeholderService.getPlaceholder("MID", this.startingMidfielders.length));
    }

    // DELANTEROS - USAR TODOS LOS DELANTEROS DISPONIBLES
    console.log(`Formación requiere ${fwdCount} delanteros`);
    console.log(`Delanteros disponibles en total: ${this.forwards.length}`, this.forwards.map(f => f.nickname));

    // TOMAR TODOS LOS DELANTEROS DISPONIBLES hasta completar la formación
    this.startingForwards = [...this.forwards.slice(0, fwdCount)];

    console.log(`Delanteros asignados al campo: ${this.startingForwards.length}`, this.startingForwards.map(f => f.nickname));

    // Solo añadir placeholders si realmente no hay suficientes delanteros
    while (this.startingForwards.length < fwdCount) {
      console.log(`Añadiendo placeholder para delantero ${this.startingForwards.length}`);
      this.startingForwards.push(this.placeholderService.getPlaceholder("FWD", this.startingForwards.length));
    }

    // RECALCULAR BANQUILLO después de asignar titulares
    this.benchPlayers = [
      ...this.goalkeepers.slice(1), // Porteros suplentes
      ...this.defenders.slice(defCount), // Defensas que no están en el campo
      ...this.midfielders.slice(midCount), // Centrocampistas que no están en el campo
      ...this.forwards.slice(fwdCount) // Delanteros que no están en el campo
    ];

    console.log('Resultado final:', {
      formation: this.currentFormation,
      startingForwards: this.startingForwards.length,
      forwardsReal: this.startingForwards.filter(p => !this.isPlaceholderPlayer(p)).length,
      benchForwards: this.benchPlayers.filter(p => p.position === 'FWD').length,
      benchPlayers: this.benchPlayers.length
    });

    // Guardar formación temporal
    const temporaryFormation = {
      formation: this.currentFormation,
      goalkeepers: [...this.startingGoalkeeper],
      defenders: [...this.startingDefenders],
      midfielders: [...this.startingMidfielders],
      forwards: [...this.startingForwards],
      captain: this.players.find(p => p.isCaptain)?.id
    };

    this.teamFormationService.setTemporaryFormation(temporaryFormation);
  }



  onFormationChange(): void {
    // LIMPIAR formación temporal antes de aplicar nueva
    this.teamFormationService.clearTemporaryFormation();

    // Aplicar nueva formación
    this.applyFormationWithPlaceholders();
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

  // Método para guardar cambios en el equipo
  saveTeamChanges(): void {
    if (this.matchdayLocked) {
      this.showWarningMessage("No se pueden guardar cambios porque la jornada está en curso");
      return;
    }

    const startingEleven = [
      ...this.startingGoalkeeper,
      ...this.startingDefenders,
      ...this.startingMidfielders,
      ...this.startingForwards
    ].filter(player => !this.isPlaceholderPlayer(player));

    const captainPlayer = this.players.find(p => p.isCaptain);
    const viceCaptainPlayer = this.players.find(p => p.isViceCaptain);

    const teamChanges = {
      formation: this.currentFormation,
      players: startingEleven,
      captainId: captainPlayer?.id,
      viceCaptainId: viceCaptainPlayer?.id
    };

    this.leagueService.saveTeamChanges(this.leagueId, teamChanges)
      .subscribe({
        next: (response) => {
          console.log("Cambios guardados con éxito");
          this.showSuccessMessage("Cambios guardados correctamente");

          // AÑADIR ESTA LÍNEA
          this.teamFormationService.clearTemporaryFormation();
        },
        error: (error) => {
          console.error("Error al guardar los cambios:", error);
          this.showErrorMessage("Error al guardar los cambios");
        }
      });
  }

  private showSuccessMessage(message: string): void {
    this.notificationService.showSuccess(message);
  }

  private showErrorMessage(message: string): void {
    this.notificationService.showError(message);
  }

  // Añadir método para warnings
  private showWarningMessage(message: string): void {
    this.notificationService.showWarning(message);
  }
}
