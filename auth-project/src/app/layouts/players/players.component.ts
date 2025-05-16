import { Component, OnInit } from '@angular/core';
import { PlayerService, Player } from './services/player.service';
import { Router } from '@angular/router';
import { ActiveLeagueService } from '../home/services/active-league.service';
import { LeagueService } from '../../modals/create-league-modal/services/create-league.service';

@Component({
  selector: 'app-players',
  templateUrl: './players.component.html',
  styleUrls: ['./players.component.scss']
})
export class PlayersComponent implements OnInit {
  jugadores: Player[] = [];
  jugadoresFiltrados: Player[] = [];
  filtroActual: string = 'Todos';
  ordenActual: string = '';
  cargando: boolean = true;
  error: string | null = null;
  ligaActivaId: string | null = null;

  constructor(
    private playerService: PlayerService,
    private router: Router,
    private activeLeagueService: ActiveLeagueService,
    private leagueService: LeagueService
  ) { }

  ngOnInit(): void {
    this.cargarJugadores();

    // Obtener la liga activa del servicio
    this.ligaActivaId = this.activeLeagueService.getActiveLeague();

    // Si no hay liga activa, intentar obtener la más reciente
    if (!this.ligaActivaId) {
      this.getRecentLeague();
    }
  }

  getRecentLeague(): void {
    this.leagueService.getUserTeams().subscribe({
      next: (response: any) => {
        if (response && response.teams && response.teams.length > 0) {
          // Usar el primer equipo de la lista (el más reciente)
          this.ligaActivaId = response.teams[0].leagueId;

          // Actualizar la liga activa en el servicio
          if (this.ligaActivaId) {
            this.activeLeagueService.setActiveLeague(this.ligaActivaId);
            console.log('Liga activa establecida:', this.ligaActivaId);
          }
        } else {
          console.log('El usuario no tiene equipos en ninguna liga');
        }
      },
      error: (error) => {
        console.error("Error al obtener equipos del usuario:", error);
      }
    });
  }

  // Método para navegar a una ruta específica con la liga activa
  navigateWithActiveLeague(route: string): void {
    if (this.ligaActivaId) {
      this.router.navigate(['/layouts/' + route, this.ligaActivaId]);
    } else {
      // Si no hay liga activa, navegar a la ruta sin parámetro
      this.router.navigate(['/layouts/' + route]);
    }
  }




  cargarJugadores() {
    this.cargando = true;
    this.playerService.getPlayers().subscribe(
      (data) => {
        if (data && Array.isArray(data)) {
          // Filtrar jugadores que NO están fuera de liga
          this.jugadores = data.filter(jugador => jugador.playerStatus !== 'out_of_league');
          this.jugadoresFiltrados = [...this.jugadores];
        } else {
          this.error = 'Error al cargar los datos. Formato incorrecto.';
        }
        this.cargando = false;
      },
      (error) => {
        console.error('Error al cargar jugadores:', error);
        this.error = 'Error al conectar con el servidor. Inténtalo más tarde.';
        this.cargando = false;
      }
    );
  }

  filtrarJugadores(filtro: string) {
    this.filtroActual = filtro;

    if (filtro === 'Todos') {
      this.jugadoresFiltrados = [...this.jugadores];
    } else {
      // Mapeo de filtros a positionId
      const positionMap: {[key: string]: string} = {
        'Porteros': '1',
        'Defensas': '2',
        'Medios': '3',
        'Delanteros': '4'
      };

      this.jugadoresFiltrados = this.jugadores.filter(jugador =>
        jugador.positionId === positionMap[filtro]
      );
    }

    // Aplicar ordenación si existe
    if (this.ordenActual) {
      this.ordenarJugadores(this.ordenActual);
    }
  }

  buscarJugador(evento: any) {
    const termino = evento.target.value.toLowerCase();
    if (!termino) {
      this.filtrarJugadores(this.filtroActual);
      return;
    }

    // Primero filtramos por la posición actual
    let jugadoresPorPosicion = this.jugadores;
    if (this.filtroActual !== 'Todos') {
      const positionMap: {[key: string]: string} = {
        'Porteros': '1',
        'Defensas': '2',
        'Medios': '3',
        'Delanteros': '4'
      };
      jugadoresPorPosicion = this.jugadores.filter(jugador =>
        jugador.positionId === positionMap[this.filtroActual]
      );
    }

    // Luego filtramos por el término de búsqueda
    this.jugadoresFiltrados = jugadoresPorPosicion.filter(jugador =>
      jugador.nickname.toLowerCase().includes(termino) ||
      jugador.team.name.toLowerCase().includes(termino)
    );

    // Aplicar ordenación si existe
    if (this.ordenActual) {
      this.ordenarJugadores(this.ordenActual);
    }
  }

  ordenarJugadores(orden: string) {
    this.ordenActual = orden;

    if (orden === 'puntosAsc') {
      this.jugadoresFiltrados.sort((a, b) => a.points - b.points);
    } else if (orden === 'puntosDesc') {
      this.jugadoresFiltrados.sort((a, b) => b.points - a.points);
    }
  }

  // Método para obtener la clase CSS según el estado del jugador
  getStatusClass(status: string): string {
    const statusMap: {[key: string]: string} = {
      'ok': 'disponible',
      'doubtful': 'duda',
      'injured': 'lesionado'
    };
    return statusMap[status] || '';
  }

  getStatusText(status: string): string {
    const statusMap: {[key: string]: string} = {
      'ok': 'Disponible',
      'doubtful': 'Duda',
      'injured': 'Lesionado'
    };
    return statusMap[status] || status;
  }

  getPointClass(points: number): string {
    if (points > 10) return 'excellent';
    if (points > 5) return 'good';
    if (points > 0) return 'average';
    if (points === 0) return 'zero';
    return 'negative';
  }

  getLastFiveWeeks(jugador: Player): Array<{weekNumber: number, points: number}> {
    if (!jugador.weekPoints || !jugador.weekPoints.length) return [];

    // Ordenamos por número de jornada descendente y tomamos las últimas 5
    return [...jugador.weekPoints]
      .sort((a, b) => b.weekNumber - a.weekNumber)
      .slice(0, 5)
      .reverse();
  }

  // Métodos para navegación
  navigateTo(route: string) {
    // Para rutas que requieren leagueId
    if (['my-team', 'classification', 'team-points', 'offers'].includes(route)) {
      this.navigateWithActiveLeague(route);
    } else {
      // Para rutas que no requieren leagueId
      this.router.navigate(['/layouts/' + route]);
    }
  }

  cerrarSesion() {
    // Aquí puedes agregar la lógica para cerrar sesión
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  irADashboard() {
    this.router.navigate(['/dashboard']);
  }
}
