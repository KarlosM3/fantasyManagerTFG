import { Component, OnInit } from '@angular/core';
import { PlayerService, Player } from './services/player.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-market',
  templateUrl: './market.component.html',
  styleUrls: ['./market.component.scss']
})
export class MarketComponent implements OnInit {
  jugadores: Player[] = [];
  jugadoresFiltrados: Player[] = [];
  filtroActual: string = 'Todos';
  cargando: boolean = true;
  error: string | null = null;

  constructor(
    private playerService: PlayerService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarJugadores();
  }

  cargarJugadores() {
    this.cargando = true;
    this.playerService.getPlayers().subscribe(
      (data) => {
        console.log('Respuesta de la API:', data);
        if (data && Array.isArray(data)) {
          this.jugadores = data;
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
      return;
    }

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
  }

  // Nuevo método para obtener la clase CSS según el estado del jugador
  getStatusClass(status: string): string {
    const statusMap: {[key: string]: string} = {
      'ok': 'disponible',
      'doubtful': 'duda',
      'injured': 'lesionado',
      'out_of_league': 'fuera-de-liga'
    };
    return statusMap[status] || '';
  }

  getStatusText(status: string): string {
    const statusMap: {[key: string]: string} = {
      'ok': 'Disponible',
      'doubtful': 'Duda',
      'injured': 'Lesionado',
      'out_of_league': 'Fuera de liga'
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
    this.router.navigate(['/layouts/' + route]);
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
