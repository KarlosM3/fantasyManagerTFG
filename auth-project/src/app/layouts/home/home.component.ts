import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { LeagueService } from '../../modals/create-league-modal/services/create-league.service';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { ActiveLeagueService } from './services/active-league.service';
import { NotificationService } from '../../services/notification.service';

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
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService
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
    this.leagueService.getUserLeagues().subscribe({
      next: (leagues) => {
        this.userLeagues = leagues;
        if (leagues.length > 0) {
          if (!this.ligaActivaId) {
            this.ligaActivaId = leagues[0]._id;
            this.activeLeagueService.setActiveLeague(this.ligaActivaId);
          } else if (!leagues.some((league: any) => league._id === this.ligaActivaId)) {
            this.ligaActivaId = leagues[0]._id;
            this.activeLeagueService.setActiveLeague(this.ligaActivaId);
          }
        } else {
          this.ligaActivaId = null;
          this.activeLeagueService.setActiveLeague(null);
        }
      },
      error: (error) => {
        console.error('Error al cargar ligas:', error);
        this.notificationService.showError('Error al cargar las ligas');
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
        this.selectedLeagueId = res.leagueId;

        // RECARGAR LIGAS INMEDIATAMENTE después de crear la liga
        this.loadUserLeagues();

        // Notificación de éxito al crear liga
        this.notificationService.showSuccess('Liga creada correctamente');

        if (this.selectedLeagueId) {
          this.leagueService.assignRandomTeam(this.selectedLeagueId).subscribe({
            next: (team: any) => {
              this.randomTeam = team.team || team;
              this.isTeamModalOpen = true;
              this.notificationService.showSuccess('Equipo aleatorio asignado');
            },
            error: (err) => {
              console.error('Error al asignar equipo aleatorio:', err);
              this.notificationService.showError('Error al asignar equipo aleatorio');
            }
          });
        }
      },
      error: (err) => {
        console.error('Error al crear la liga:', err);
        this.notificationService.showError('Error al crear la liga');
      }
    });
  }




  // Nuevo método para cerrar el modal y navegar a clasificación
  closeTeamModalAndGoToClassification() {
    this.isTeamModalOpen = false;
    if (this.selectedLeagueId) {
      this.notificationService.showSuccess('¡Bienvenido a tu nueva liga!');
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
    if (this.adminStatusCache[liga._id] !== undefined) {
      return this.adminStatusCache[liga._id];
    }

    this.adminStatusCache[liga._id] = false;

    this.leagueService.isLeagueAdmin(liga._id).subscribe({
      next: (response) => {
        if (response.success) {
          this.adminStatusCache[liga._id] = response.isAdmin;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error al verificar permisos:', err);
        this.notificationService.showWarning('Error al verificar permisos de administrador');
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
        // REEMPLAZAR alert() por notificación
        this.notificationService.showSuccess('Liga eliminada correctamente');

        this.loadUserLeagues();
        this.showDeleteConfirmModal = false;
        this.leagueToDelete = null;
      },
      error: (error) => {
        console.error('Error al eliminar la liga:', error);
        // REEMPLAZAR alert() por notificación de error
        this.notificationService.showError(
          error.error?.message || 'Error al eliminar la liga. Inténtalo de nuevo más tarde'
        );
      }
    });
  }

  showInviteModal(liga: any): void {
    this.selectedLeague = liga;
    this.showInvite_Modal = true;

    this.leagueService.getInviteLink(liga._id).subscribe({
      next: (response) => {
        if (response.inviteCode) {
          this.inviteLink = `${window.location.origin}/join-league/${response.inviteCode}`;
        }
      },
      error: (error) => {
        console.error('Error al obtener enlace de invitación:', error);
        this.notificationService.showError('Error al generar enlace de invitación');
      }
    });
  }

  closeInviteModal(): void {
    this.selectedLeague = null;
    this.showInvite_Modal = false;
    this.inviteLink = '';
  }

  async copyInviteLink(inputElement: HTMLInputElement): Promise<void> {
    try {
      // Método moderno para copiar
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(this.inviteLink);
        this.notificationService.showSuccess('Enlace copiado al portapapeles');
      } else {
        // Fallback para navegadores antiguos
        inputElement.select();
        document.execCommand('copy');
        this.notificationService.showSuccess('Enlace copiado al portapapeles');
      }
    } catch (error) {
      console.error('Error al copiar:', error);
      this.notificationService.showError('Error al copiar el enlace');
    }
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
