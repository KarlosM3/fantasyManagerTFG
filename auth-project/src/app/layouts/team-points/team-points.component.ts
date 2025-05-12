import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { PointsService } from "../../services/points.service";
import { PlayerPoints, MatchdayPoints } from "../../shared/models/points.model";
import { LeagueService } from "../../modals/create-league-modal/services/create-league.service";

@Component({
  selector: "app-team-points",
  templateUrl: "./team-points.component.html",
  styleUrls: ["./team-points.component.scss"],
})
export class TeamPointsComponent implements OnInit {
  teamId!: string;
  matchday: number = 1;
  playerPoints: PlayerPoints[] = [];
  pointsHistory: MatchdayPoints[] = [];
  totalPoints: number = 0;
  loading: boolean = true;
  availableMatchdays: number[] = [];
  leagueId!: string;
  formation: string = "4-4-2"; // Formación por defecto
  errorMessage: string = '';
  successMessage: string = '';

  // Añade esta propiedad para almacenar los jugadores del equipo
  teamPlayers: any[] = [];

  // Jugadores por posición
  goalkeepers: PlayerPoints[] = [];
  defenders: PlayerPoints[] = [];
  midfielders: PlayerPoints[] = [];
  forwards: PlayerPoints[] = [];

  // Mapeo de positionId a posición legible
  positionMap: { [key: number]: string } = {
    1: "POR",
    2: "DEF",
    3: "MED",
    4: "DEL"
  };

  constructor(
    private route: ActivatedRoute,
    private pointsService: PointsService,
    private leagueService: LeagueService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.leagueId = params["leagueId"];

      // Primero obtener el equipo del usuario en esta liga
      this.leagueService.getMyTeam(this.leagueId).subscribe({
        next: (teamData) => {
          console.log('Datos completos del equipo:', teamData);

          // Buscar el ID del equipo en la respuesta
          let teamId = null;

          // Opción 1: Si el ID está en la raíz del objeto
          if (teamData && teamData._id) {
            teamId = teamData._id;
          }
          // Opción 2: Si hay un objeto team con _id
          else if (teamData && teamData.team && teamData.team._id) {
            teamId = teamData.team._id;
          }
          // Opción 3: Si hay un ID en algún otro lugar
          else if (teamData && teamData.id) {
            teamId = teamData.id;
          }

          if (teamId) {
            this.teamId = teamId;
            this.formation = teamData.formation || teamData.team?.formation || "4-4-2";

            // Guardar los jugadores del equipo
            if (teamData.playersData && teamData.playersData.length > 0) {
              this.teamPlayers = teamData.playersData;

              // Organizar jugadores por posición incluso si no hay puntos
              this.organizeTeamPlayersByPosition();
            }

            console.log('ID del equipo encontrado:', this.teamId);
            this.loadPointsHistory();
          } else {
            console.error('No se encontró ID de equipo en los datos recibidos', teamData);
            this.errorMessage = 'No se pudo obtener la información del equipo';
            this.loading = false;
          }
        },
        error: (error) => {
          console.error('Error al obtener el equipo:', error);
          this.errorMessage = 'Error al cargar el equipo';
          this.loading = false;
        }
      });
    });

    console.log('No se mete ya te lo digo yo');
  }

  // Nuevo método para organizar los jugadores del equipo por posición
  organizeTeamPlayersByPosition(): void {
    // Limpiar arrays previos
    this.goalkeepers = [];
    this.defenders = [];
    this.midfielders = [];
    this.forwards = [];

    console.log('Organizando jugadores por posición:', this.teamPlayers.length);

    // Verificar estructura de los jugadores
    if (this.teamPlayers.length > 0) {
      console.log('Ejemplo de jugador:', this.teamPlayers[0]);
    }

    // Clasificar jugadores por posición
    this.teamPlayers.forEach((player, index) => {
      console.log(`Procesando jugador ${index}:`, player);

      // Asegurarse de que el jugador tenga todas las propiedades necesarias
      if (!player.position && !player.positionId) {
        console.warn(`Jugador sin posición:`, player);
        return; // Saltar este jugador
      }

      // Asegurarse de que el jugador tenga un badge de equipo
      if (player.team && !player.team.badge) {
        // Si tiene badgeColor y es una URL completa, usarla directamente
        if (player.team.badgeColor && player.team.badgeColor.startsWith('http')) {
          player.team.badge = player.team.badgeColor;
        }
        // Si tiene badgeColor pero no es URL, crear ruta a imagen genérica
        else if (player.team.badgeColor) {
          player.team.badge = `assets/img/teams/generic-${player.team.badgeColor}.png`;
        } else {
          player.team.badge = 'assets/img/team-placeholder.png';
        }
      }

      // Añadir puntos = 0 si no tiene puntos
      if (!player.points) {
        player.points = 0;
      }

      // Determinar la posición del jugador
      let position = '';
      if (player.position) {
        position = player.position;
      } else if (player.positionId) {
        position = this.positionMap[player.positionId] || 'N/A';
      }

      console.log(`Jugador ${player.nickname || player.name}, Posición: ${position}, PositionId: ${player.positionId}`);

      // Clasificar por positionId o position (usando == en lugar de === para comparación menos estricta)
      if (player.positionId == 1 || position === 'POR') {
        this.goalkeepers.push(player);
      } else if (player.positionId == 2 || position === 'DEF') {
        this.defenders.push(player);
      } else if (player.positionId == 3 || position === 'MED') {
        this.midfielders.push(player);
      } else if (player.positionId == 4 || position === 'DEL') {
        this.forwards.push(player);
      }
    });

    console.log(`Jugadores organizados: ${this.goalkeepers.length} porteros, ${this.defenders.length} defensas, ${this.midfielders.length} centrocampistas, ${this.forwards.length} delanteros`);

    // Obtener formación del equipo (por ejemplo, "4-3-3")
    const formationParts = this.formation.split('-').map(Number);

    // Limitar jugadores según la formación
    // Siempre 1 portero
    this.goalkeepers = this.goalkeepers.slice(0, 1);

    // Defensas, centrocampistas y delanteros según formación
    if (formationParts.length === 3) {
      this.defenders = this.defenders.slice(0, formationParts[0]);
      this.midfielders = this.midfielders.slice(0, formationParts[1]);
      this.forwards = this.forwards.slice(0, formationParts[2]);
    }
  }


  // Modificar el método loadPointsHistory para usar los jugadores del equipo cuando no hay puntos
  loadPointsHistory(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.pointsService.getTeamPointsHistory(this.teamId).subscribe({
      next: (response) => {
        if (response.success) {
          this.pointsHistory = response.data;

          // Crear array con todas las jornadas disponibles
          this.availableMatchdays = this.pointsHistory.map((mp) => mp.matchday);

          if (this.availableMatchdays.length > 0) {
            // Ordenar jornadas de forma descendente
            this.availableMatchdays.sort((a, b) => b - a);

            // Si no se especificó jornada, usar la última
            const routeMatchday = this.route.snapshot.queryParamMap.get('matchday');
            if (routeMatchday) {
              this.matchday = parseInt(routeMatchday, 10);
            } else {
              this.matchday = this.availableMatchdays[0];
            }

            // Cargar puntos de la jornada seleccionada
            this.loadPointsByMatchday(this.matchday);
          } else {
            // Si no hay jornadas disponibles, mostrar la jornada 1 por defecto
            this.availableMatchdays = [1];
            this.matchday = 1;
            this.loading = false;
            this.successMessage = 'No hay datos de puntos disponibles aún. Mostrando alineación actual.';

            // Usar los jugadores del equipo si no hay datos de puntos
            if (this.playerPoints.length === 0 && this.teamPlayers.length > 0) {
              // Ya tenemos los jugadores organizados por posición
            }
          }

          // Calcular puntos totales
          this.totalPoints = this.pointsHistory.reduce((sum, mp) => sum + mp.total_points, 0);
        } else {
          this.errorMessage = 'Error al cargar el historial de puntos';
          this.loading = false;
        }
      },
      error: (error) => {
        console.error("Error al cargar historial de puntos:", error);
        this.errorMessage = 'Error al cargar el historial de puntos';
        this.loading = false;
      },
    });
  }

  loadPointsByMatchday(matchday: number): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.matchday = matchday;

    this.pointsService.getTeamPointsByMatchday(this.teamId, matchday).subscribe({
      next: (response) => {
        if (response.success) {
          // Guardar los puntos de la jornada actual
          this.playerPoints = response.data;

          // Actualizar los puntos de los jugadores en las arrays por posición
          this.updatePlayerPointsForMatchday();

          this.successMessage = `Puntos de la jornada ${matchday} cargados correctamente`;
        } else {
          this.errorMessage = 'Error al cargar los puntos de la jornada';
        }
        this.loading = false;
      },
      error: (error) => {
        console.error("Error al cargar puntos de la jornada:", error);
        this.errorMessage = 'Error al cargar los puntos de la jornada';
        this.loading = false;
      },
    });
  }

  // Nuevo método para actualizar los puntos de la jornada actual
  updatePlayerPointsForMatchday(): void {
    // Función para actualizar puntos en un array de jugadores
    const updatePoints = (players: any[]) => {
      players.forEach(player => {
        // Buscar si hay puntos para este jugador en la jornada actual
        const matchdayPoints = this.playerPoints.find(p => p.id === player.id);
        // Asignar los puntos de la jornada o 0 si no hay
        player.matchdayPoints = matchdayPoints ? matchdayPoints.points : 0;
      });
    };

    // Actualizar puntos para cada posición
    updatePoints(this.goalkeepers);
    updatePoints(this.defenders);
    updatePoints(this.midfielders);
    updatePoints(this.forwards);
  }


  organizePlayersByPosition(): void {
    // Limpiar arrays previos
    this.goalkeepers = [];
    this.defenders = [];
    this.midfielders = [];
    this.forwards = [];

    // Clasificar jugadores por posición
    this.playerPoints.forEach(player => {
      // Asegurarse de que el jugador tenga un badge de equipo
      if (player.team && !player.team.badge) {
        // Si no tiene badge pero tiene badgeColor, crear una URL para un badge genérico
        if (player.team.badgeColor) {
          player.team.badge = `assets/img/teams/generic-${player.team.badgeColor}.png`;
        } else {
          player.team.badge = 'assets/img/team-placeholder.png';
        }
      }

      // Clasificar por positionId o position
      if (player.positionId === 1 || player.position === 'POR') {
        this.goalkeepers.push(player);
      } else if (player.positionId === 2 || player.position === 'DEF') {
        this.defenders.push(player);
      } else if (player.positionId === 3 || player.position === 'MED') {
        this.midfielders.push(player);
      } else if (player.positionId === 4 || player.position === 'DEL') {
        this.forwards.push(player);
      }
    });

    // Obtener formación del equipo (por ejemplo, "4-3-3")
    const formationParts = this.formation.split('-').map(Number);

    // Limitar jugadores según la formación
    // Siempre 1 portero
    this.goalkeepers = this.goalkeepers.slice(0, 1);

    // Defensas, centrocampistas y delanteros según formación
    if (formationParts.length === 3) {
      this.defenders = this.defenders.slice(0, formationParts[0]);
      this.midfielders = this.midfielders.slice(0, formationParts[1]);
      this.forwards = this.forwards.slice(0, formationParts[2]);
    }
  }

  changeMatchday(matchday: number): void {
    this.loadPointsByMatchday(matchday);
  }

  getMatchdayPoints(matchday: number): number {
    const found = this.pointsHistory.find((mp) => mp.matchday === matchday);
    return found ? found.total_points : 0;
  }

  getFormationString(): string {
    // Si no hay suficientes jugadores para mostrar la formación completa
    if (this.playerPoints.length < 11) {
      return this.formation; // Devolver la formación guardada
    }

    // Calcular formación basada en los jugadores actuales
    return `${this.defenders.length}-${this.midfielders.length}-${this.forwards.length}`;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0
    }).format(value);
  }

  // Método para limpiar mensajes
  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
