import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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

  showDeleteConfirmModal = false;
  leagueToDelete: any = null;
  showInvite_Modal = false;
  selectedLeague: any = null;
  inviteLink = '';

  private adminStatusCache: {[key: string]: boolean} = {};

  constructor(
    private authService: AuthService,
    private router: Router,
    private leagueService: LeagueService,
    private activeLeagueService: ActiveLeagueService,
    private cdr: ChangeDetectorRef
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

  isLeagueAdmin(liga: any): boolean {
    // Si ya tenemos el resultado en caché, usarlo
    if (this.adminStatusCache[liga._id] !== undefined) {
      return this.adminStatusCache[liga._id];
    }

    // Si no está en caché, asumir que no es admin por defecto
    this.adminStatusCache[liga._id] = false;

    // Hacer la llamada al backend para verificar
    this.leagueService.isLeagueAdmin(liga._id).subscribe({
      next: (response) => {
        if (response.success) {
          this.adminStatusCache[liga._id] = response.isAdmin;
          // Forzar la detección de cambios si es necesario
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error al verificar permisos:', err);
      }
    });

    return this.adminStatusCache[liga._id];
  }

  confirmDeleteLeague(liga: any): void {
    this.leagueToDelete = liga;
    this.showDeleteConfirmModal = true;
  }

  cancelDeleteLeague(): void {
    this.leagueToDelete = null;
    this.showDeleteConfirmModal = false;
  }

  deleteLeague(): void {
    if (!this.leagueToDelete) return;

    this.leagueService.deleteLeague(this.leagueToDelete._id).subscribe({
      next: (response) => {
        // Mostrar mensaje de éxito
        alert('Liga eliminada correctamente');
        // Actualizar la lista de ligas
        this.loadUserLeagues();
        // Cerrar el modal
        this.showDeleteConfirmModal = false;
        this.leagueToDelete = null;
      },
      error: (error) => {
        console.error('Error al eliminar la liga:', error);
        alert('Error al eliminar la liga: ' + (error.error?.message || 'Inténtalo de nuevo más tarde'));
      }
    });
  }

  showInviteModal(liga: any): void {
    this.selectedLeague = liga;
    this.showInvite_Modal = true;

    // Generar enlace de invitación
    this.leagueService.getInviteLink(liga._id).subscribe({
      next: (response) => {
        if (response.inviteCode) {
          this.inviteLink = `${window.location.origin}/join-league/${response.inviteCode}`;
        }
      },
      error: (error) => {
        console.error('Error al obtener enlace de invitación:', error);
      }
    });
  }

  closeInviteModal(): void {
    this.selectedLeague = null;
    this.showInvite_Modal = false;
    this.inviteLink = '';
  }

  copyInviteLink(inputElement: HTMLInputElement): void {
    inputElement.select();
    document.execCommand('copy');
    alert('Enlace copiado al portapapeles');
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

}
