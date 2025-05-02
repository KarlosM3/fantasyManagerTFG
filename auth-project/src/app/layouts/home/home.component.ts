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

  constructor(
    private authService: AuthService,
    private router: Router,
    private leagueService: LeagueService,
    private activeLeagueService: ActiveLeagueService
  ) {}

  ngOnInit(): void {
    this.userName = this.authService.getUserName();
    this.loadUserLeagues();
    // Inicializa la liga activa si ya hay una guardada
    this.ligaActivaId = this.activeLeagueService.getActiveLeague();
  }

  loadUserLeagues(): void {
    this.leagueService.getUserLeagues().subscribe(leagues => {
      this.userLeagues = leagues;
      // Si no hay liga activa, selecciona la primera por defecto
      if (leagues.length > 0 && !this.activeLeagueService.getActiveLeague()) {
        this.activeLeagueService.setActiveLeague(leagues[0]._id);
        this.ligaActivaId = leagues[0]._id;
      } else if (leagues.length > 0) {
        // Si ya hay una liga activa, actualiza la propiedad local
        this.ligaActivaId = this.activeLeagueService.getActiveLeague();
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
