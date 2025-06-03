// src/app/services/player-api-monitor.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, interval, Observable, of } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';

export interface PlayerApiStatus {
  lastDataUpdate: Date;
  currentMatchday: number;
  playersUpdated: number;
  totalPlayers: number;
  dataFreshness: 'fresh' | 'stale' | 'outdated';
  apiResponseTime: number;
  lastCheck: Date;
  weekPointsComplete: boolean;
  playersWithoutCurrentWeek: number;
}

@Injectable({
  providedIn: 'root'
})
export class PlayerApiMonitorService {
  private apiStatusSubject = new BehaviorSubject<PlayerApiStatus | null>(null);
  public apiStatus$ = this.apiStatusSubject.asObservable();

  private notificationSubject = new BehaviorSubject<any>(null);
  public notification$ = this.notificationSubject.asObservable();

  constructor(private http: HttpClient) {
    this.startMonitoring();
  }

  private startMonitoring() {
    interval(180000)
      .pipe(
        switchMap(() => this.checkPlayerApiStatus())
      )
      .subscribe(status => {
        const previousStatus = this.apiStatusSubject.value;

        if (previousStatus && status) {
          if (status.currentMatchday > previousStatus.currentMatchday) {
            this.showNotification(
              `Nueva jornada disponible: Jornada ${status.currentMatchday}`,
              'matchday-update'
            );
          }

          if (status.dataFreshness !== previousStatus.dataFreshness) {
            this.showDataFreshnessNotification(status.dataFreshness);
          }
        }

        this.apiStatusSubject.next(status);
      });

    // Verificación inicial
    this.checkPlayerApiStatus().subscribe(status => {
      this.apiStatusSubject.next(status);
    });
  }

  private checkPlayerApiStatus(): Observable<PlayerApiStatus> {
    const startTime = Date.now();

    return this.http.get<any[]>('http://localhost:3000/api/external/players')
      .pipe(
        map(players => {
          const responseTime = Date.now() - startTime;
          return this.analyzePlayerData(players, responseTime);
        }),
        catchError(error => {
          console.error('Error checking player API:', error);
          return of({
            lastDataUpdate: new Date(),
            currentMatchday: 36, // Basado en tus datos
            playersUpdated: 0,
            totalPlayers: 0,
            dataFreshness: 'outdated' as const,
            apiResponseTime: Date.now() - startTime,
            lastCheck: new Date(),
            weekPointsComplete: false,
            playersWithoutCurrentWeek: 0
          });
        })
      );
  }

  private analyzePlayerData(players: any[], responseTime: number): PlayerApiStatus {
    const now = new Date();

    // Filtrar jugadores activos
    const activePlayers = players.filter(player =>
      player.playerStatus !== 'outofleague'
    );

    console.log(`Analizando ${activePlayers.length} jugadores activos de ${players.length} totales`);

    // Encontrar la jornada más alta con datos
    let currentMatchday = 0;
    activePlayers.forEach(player => {
      if (player.weekPoints && Array.isArray(player.weekPoints)) {
        const weekNumbers = player.weekPoints.map((wp: any) => wp.weekNumber);
        const maxWeek = Math.max(...weekNumbers);
        if (maxWeek > currentMatchday) {
          currentMatchday = maxWeek;
        }
      }
    });

    // Analizar jugadores con datos para la jornada actual
    let playersWithCurrentMatchday = 0;
    let playersWithRecentActivity = 0;
    let totalActivePlayersInSeason = 0;
    let lastDataUpdate = new Date(0);

    activePlayers.forEach(player => {
      if (player.weekPoints && Array.isArray(player.weekPoints)) {
        // Verificar si tiene datos para la jornada actual
        const hasCurrentWeekData = player.weekPoints.some((wp: any) =>
          wp.weekNumber === currentMatchday
        );

        if (hasCurrentWeekData) {
          playersWithCurrentMatchday++;
          lastDataUpdate = now;
        }

        // Verificar si ha tenido actividad en las últimas 5 jornadas
        const hasRecentActivity = player.weekPoints.some((wp: any) =>
          wp.weekNumber >= (currentMatchday - 5) && wp.weekNumber <= currentMatchday
        );

        if (hasRecentActivity) {
          playersWithRecentActivity++;
        }

        // Contar jugadores que han jugado al menos una vez esta temporada
        if (player.weekPoints.length > 0) {
          totalActivePlayersInSeason++;
        }
      }
    });

    console.log(`Jornada ${currentMatchday} - Análisis completo:`);
    console.log(`- Jugadores con datos jornada actual: ${playersWithCurrentMatchday}`);
    console.log(`- Jugadores con actividad reciente: ${playersWithRecentActivity}`);
    console.log(`- Total jugadores activos temporada: ${totalActivePlayersInSeason}`);

    let dataFreshness: 'fresh' | 'stale' | 'outdated';
    let referenceTotal = 0;
    let completionPercentage = 0;

    // Determinar el total de referencia según el número de jugadores con datos
    if (playersWithCurrentMatchday >= 400) {
      referenceTotal = playersWithRecentActivity;
      completionPercentage = playersWithCurrentMatchday / referenceTotal;

      if (completionPercentage >= 0.8) {
        dataFreshness = 'fresh';
      } else if (completionPercentage >= 0.70) {
        dataFreshness = 'stale';
      } else {
        dataFreshness = 'outdated';
      }

    } else if (playersWithCurrentMatchday >= 200) {
      // Jornada parcialmente completada
      referenceTotal = playersWithRecentActivity;
      completionPercentage = playersWithCurrentMatchday / referenceTotal;

      if (completionPercentage >= 0.8) {
        dataFreshness = 'fresh';
      } else if (completionPercentage >= 0.40) {
        dataFreshness = 'stale';
      } else {
        dataFreshness = 'outdated';
      }

    } else if (playersWithCurrentMatchday >= 50) {
      // Jornada en sus primeras fases
      referenceTotal = Math.min(playersWithRecentActivity, 500);
      completionPercentage = playersWithCurrentMatchday / referenceTotal;

      if (completionPercentage >= 0.8) {
        dataFreshness = 'fresh';
      } else if (completionPercentage >= 0.40) {
        dataFreshness = 'stale';
      } else {
        dataFreshness = 'outdated';
      }

    } else {
      // Muy pocos datos - jornada no iniciada o problema con la API
      referenceTotal = playersWithRecentActivity;
      completionPercentage = playersWithCurrentMatchday / Math.max(referenceTotal, 1);
      dataFreshness = 'outdated';
    }

    const expectedMatchday = 38;
    if (currentMatchday < expectedMatchday) {
      console.log(`Jornada detectada (${currentMatchday}) menor que esperada (${expectedMatchday})`);
      dataFreshness = playersWithCurrentMatchday >= 300 ? 'fresh' : 'stale';
    }

    const weekPointsComplete = completionPercentage >= 0.80;

    console.log(`Estado final: ${dataFreshness} (${(completionPercentage * 100).toFixed(1)}%)`);

    return {
      lastDataUpdate,
    currentMatchday,
    playersUpdated: playersWithCurrentMatchday,
    totalPlayers: referenceTotal || totalActivePlayersInSeason,
    dataFreshness,
    apiResponseTime: responseTime,
    lastCheck: now,
    weekPointsComplete,
    playersWithoutCurrentWeek: (referenceTotal || totalActivePlayersInSeason) - playersWithCurrentMatchday
    };
  }



  private showNotification(message: string, type: string) {
    this.notificationSubject.next({
      type,
      message,
      timestamp: new Date(),
      show: true
    });

    setTimeout(() => {
      this.notificationSubject.next({ show: false });
    }, 5000);
  }

  private showDataFreshnessNotification(freshness: string) {
    const messages: Record<string, string> = {
      'fresh': 'Datos de jugadores completamente actualizados',
      'stale': 'Datos de jugadores parcialmente actualizados',
      'outdated': 'Datos de jugadores necesitan actualización'
    };

    this.showNotification(messages[freshness] || 'Estado desconocido', 'data-freshness');
  }

  getCurrentStatus(): Observable<PlayerApiStatus | null> {
    return this.apiStatus$;
  }

  forceCheck(): void {
    this.checkPlayerApiStatus().subscribe(status => {
      this.apiStatusSubject.next(status);
    });
  }
}
