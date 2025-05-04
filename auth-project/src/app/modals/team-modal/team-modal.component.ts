import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-team-modal',
  templateUrl: './team-modal.component.html',
  styleUrls: ['./team-modal.component.scss']
})
export class TeamModalComponent {
  @Input() isOpen = false;
  @Input() team: any[] = [];
  @Input() leagueId!: string;
  @Output() close = new EventEmitter();

  constructor(private router: Router) {}

  // Calcula el valor total del equipo
  get totalTeamValue(): number {
    return this.team?.reduce((acc, p) => acc + (p.marketValue ? +p.marketValue : 0), 0) || 0;
  }

  onNext() {
    // Navegar directamente desde el modal
    if (this.leagueId) {
      this.router.navigate(['/layouts/classification', this.leagueId]);
    }
    this.close.emit();
  }


  // Devuelve la clase CSS según el estado del jugador
  getPlayerStatusClass(status: string): string {
    if (status === 'ok') return 'status-ok';
    if (status === 'injured') return 'status-injured';
    if (status === 'doubt') return 'status-doubt';
    return '';
  }

  // Devuelve el texto del estado del jugador
  getPlayerStatusText(status: string): string {
    if (status === 'ok') return 'Disponible';
    if (status === 'injured') return 'Lesionado';
    if (status === 'doubt') return 'Duda';
    return status;
  }

  // Filtra jugadores por posición
  getPlayersByPosition(positionId: string): any[] {
    return this.team?.filter(p => p.positionId === positionId) || [];
  }

  closeModal(): void {
    this.close.emit();
  }
}
