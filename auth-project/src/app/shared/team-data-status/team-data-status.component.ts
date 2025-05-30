// src/app/shared/team-data-status/team-data-status.component.ts
import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { PlayerApiMonitorService, PlayerApiStatus } from '../../services/player-api-monitor.service';

@Component({
  selector: 'app-team-data-status',
  templateUrl: './team-data-status.component.html',
  styleUrls: ['./team-data-status.component.scss']
})
export class TeamDataStatusComponent implements OnInit, OnDestroy {
  @Input() componentType: 'team-points' | 'my-team' = 'my-team';

  apiStatus: PlayerApiStatus | null = null;
  notification: any = null;
  showDetails = false;
  isRefreshing = false;

  private subscriptions: Subscription[] = [];

  constructor(private playerApiMonitor: PlayerApiMonitorService) {}

  ngOnInit() {
    this.subscriptions.push(
      this.playerApiMonitor.getCurrentStatus().subscribe(status => {
        this.apiStatus = status;
      })
    );

    this.subscriptions.push(
      this.playerApiMonitor.notification$.subscribe(notification => {
        this.notification = notification;
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  getStatusClass(): string {
    if (!this.apiStatus) return 'unknown';

    switch (this.apiStatus.dataFreshness) {
      case 'fresh': return 'fresh';
      case 'stale': return 'stale';
      case 'outdated': return 'outdated';
      default: return 'unknown';
    }
  }

  getStatusIcon(): string {
    if (!this.apiStatus) return 'fa-question-circle';

    switch (this.apiStatus.dataFreshness) {
      case 'fresh': return 'fa-check-circle';
      case 'stale': return 'fa-exclamation-triangle';
      case 'outdated': return 'fa-times-circle';
      default: return 'fa-question-circle';
    }
  }

  getStatusText(): string {
    if (!this.apiStatus) return 'Estado desconocido';

    const playersCount = this.apiStatus.playersUpdated;
    const matchday = this.apiStatus.currentMatchday;

    switch (this.apiStatus.dataFreshness) {
      case 'fresh':
        if (playersCount >= 400) {
          return `Jornada ${matchday} completada`;
        } else if (playersCount >= 200) {
          return `Jornada ${matchday} en finalización`;
        } else {
          return `Jornada ${matchday} iniciada`;
        }
      case 'stale':
        return `Jornada ${matchday} actualizándose`;
      case 'outdated':
        if (playersCount < 50) {
          return `Jornada ${matchday} no iniciada`;
        } else {
          return `Jornada ${matchday} pendiente`;
        }
      default:
        return 'Estado desconocido';
    }
  }

  getStatusDetail(): string {
    if (!this.apiStatus) return '';

    const playersCount = this.apiStatus.playersUpdated;
    const totalPlayers = this.apiStatus.totalPlayers;
    const percentage = totalPlayers > 0 ? Math.round((playersCount / totalPlayers) * 100) : 0;
    const matchday = this.apiStatus.currentMatchday;

    if (playersCount >= 400) {
      return `${playersCount} jugadores con puntos finalizados - Jornada ${matchday}`;
    } else if (playersCount >= 200) {
      return `${playersCount} jugadores actualizados - Jornada ${matchday} en curso`;
    } else if (playersCount >= 50) {
      return `${playersCount} jugadores con datos iniciales - Jornada ${matchday}`;
    } else {
      return `${playersCount} jugadores con datos - Esperando Jornada ${matchday}`;
    }
  }

  getMatchdayStatus(): string {
    if (!this.apiStatus) return 'Desconocido';

    const playersCount = this.apiStatus.playersUpdated;

    if (playersCount >= 400) return 'Finalizada';
    if (playersCount >= 200) return 'En curso';
    if (playersCount >= 50) return 'Iniciada';
    return 'Pendiente';
  }

  refreshData() {
    this.isRefreshing = true;
    this.playerApiMonitor.forceCheck();

    setTimeout(() => {
      this.isRefreshing = false;
    }, 2000);
  }

  hideNotification() {
    this.notification = { ...this.notification, show: false };
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} min`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours}h`;

    return date.toLocaleDateString();
  }

}
