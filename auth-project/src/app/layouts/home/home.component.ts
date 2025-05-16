import { Component, OnInit } from '@angular/core';
import { LeagueService } from '../../modals/create-league-modal/services/create-league.service';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { ActiveLeagueService } from './services/active-league.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  userName: string = '';
  userLeagues: any[] = [];
  isCreateLeagueModalOpen = false;
  selectedLeagueId: string | null = null;
  ligaActivaId: string | null = null;
  isTeamModalOpen = false;
  randomTeam: any[] = [];
  equipoId: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private leagueService: LeagueService,
    private activeLeagueService: ActiveLeagueService
  ) {}

  ngOnInit(): void {
    this.userName = this.authService.getUserName();

    // Verificar si hay una liga activa guardada
    this.ligaActivaId = this.activeLeagueService.getActiveLeague();

    // Cargar las ligas del usuario
    this.loadUserLeagues();
  }


  navegarAPuntosEquipo() {
    if (this.equipoId) {
      console.log('Navegando a puntos del equipo:', this.equipoId);
      this.router.navigate(['/layouts/team-points', this.equipoId]);
    } else {
      console.log('No hay ID de equipo disponible');
    }
  }

  loadUserLeagues(): void {
    this.leagueService.getUserLeagues().subscribe(leagues => {
      this.userLeagues = leagues;

      if (leagues.length > 0) {
        // Si no hay liga activa, seleccionar la primera por defecto
        if (!this.ligaActivaId) {
          this.ligaActivaId = leagues[0]._id;
          this.activeLeagueService.setActiveLeague(this.ligaActivaId);
        }
        // Verificar que la liga activa existe entre las ligas del usuario
        else if (!leagues.some((league: any) => league._id === this.ligaActivaId)) {
          // Si la liga activa no existe en las ligas del usuario, usar la primera
          this.ligaActivaId = leagues[0]._id;
          this.activeLeagueService.setActiveLeague(this.ligaActivaId);
        }
      } else {
        // Si no hay ligas, asegurarse de que no haya liga activa
        this.ligaActivaId = null;
        this.activeLeagueService.setActiveLeague(null);
      }
    });
  }


  openCreateLeagueModal() {
    this.isCreateLeagueModalOpen = true;
  }

  closeCreateLeagueModal() {
    this.isCreateLeagueModalOpen = false;
  }

  onCreateLeague(leagueData: any) {
    this.leagueService.createLeague(leagueData).subscribe({
      next: (res: any) => {
        this.closeCreateLeagueModal();
        this.loadUserLeagues();
        this.selectedLeagueId = res.leagueId;

        // Solo llama si selectedLeagueId no es null
        if (this.selectedLeagueId) {
          this.leagueService.assignRandomTeam(this.selectedLeagueId).subscribe({
            next: (team: any[]) => {
              this.randomTeam = team;
              this.isTeamModalOpen = true;
            },
            error: (err) => {
              console.error('Error al asignar equipo aleatorio:', err);
            }
          });
        }
      },
      error: (err) => {
        console.error('Error al crear la liga:', err);
      }
    });
  }

  // Nuevo método para cerrar el modal y navegar a clasificación
  closeTeamModalAndGoToClassification() {
    this.isTeamModalOpen = false;
    if (this.selectedLeagueId) {
      this.router.navigate(['/layouts/classification', this.selectedLeagueId]);
    }
  }

  // Si tienes esta función para abrir equipo aleatorio de una liga existente
  onSelectLeague(liga: any) {
    this.leagueService.assignRandomTeam(liga._id).subscribe({
      next: (team) => {
        this.randomTeam = team;
        this.isTeamModalOpen = true;
      },
      error: (err) => {
        console.error('Error al asignar equipo aleatorio:', err);
      }
    });
  }

  closeTeamModal() {
    this.isTeamModalOpen = false;
  }

  navegarAClasificacion(leagueId: string) {
    this.activeLeagueService.setActiveLeague(leagueId);
    this.ligaActivaId = leagueId;
    this.router.navigate(['/layouts/classification', leagueId]);
  }

}
