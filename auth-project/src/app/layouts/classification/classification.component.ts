import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LeagueService } from '../../modals/create-league-modal/services/create-league.service';

@Component({
  selector: 'app-classification',
  templateUrl: './classification.component.html',
  styleUrls: ['./classification.component.scss']
})
export class ClassificationComponent implements OnInit {
  leagueId: string = '';
  league: any;
  leagueUsers: any[] = [];
  isInviteModalOpen = false;
  refreshInterval: any;

  constructor(
    private route: ActivatedRoute,
    private leagueService: LeagueService
  ) {}

  ngOnInit(): void {
    this.leagueId = this.route.snapshot.paramMap.get('leagueId') || '';
    console.log('League ID:', this.leagueId);

    if (this.leagueId) {
      this.loadClassification();

      // Actualizar cada 30 segundos
      this.refreshInterval = setInterval(() => {
        this.loadClassification();
      }, 30000);
    } else {
      console.error('No se ha proporcionado un ID de liga válido');
    }
  }

  // Limpiar el intervalo al destruir el componente
  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  loadClassification(): void {
    this.leagueService.getLeagueClassification(this.leagueId).subscribe((users) => {
      this.leagueUsers = users;
    });

  }


  openInviteModal() {
    this.isInviteModalOpen = true;
  }

  closeInviteModal() {
    this.isInviteModalOpen = false;
  }

  // classification.component.ts
inviteLink: string | null = null;

generateInviteLink() {
  this.leagueService.getInviteLink(this.leagueId).subscribe({
    next: (res: any) => {
      this.inviteLink = res.inviteLink;
    },
    error: (err) => {
      console.error('Error al generar enlace de invitación:', err);
    }
  });
}

copyInviteLink(inputElement: HTMLInputElement) {
  inputElement.select();
  document.execCommand('copy');
  // Mostrar notificación de copiado
  this.showNotification('Enlace copiado al portapapeles');
}

showNotification(message: string) {
  // Implementa tu sistema de notificaciones
  // Puede ser un toast, un snackbar, etc.
}

}
