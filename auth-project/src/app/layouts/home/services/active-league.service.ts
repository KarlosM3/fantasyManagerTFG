import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ActiveLeagueService {
  private readonly STORAGE_KEY = 'ligaActiva';

  setActiveLeague(id: string | null) {
    if (id === null) {
      localStorage.removeItem(this.STORAGE_KEY);
    } else {
      localStorage.setItem(this.STORAGE_KEY, id);
    }
  }

  getActiveLeague(): string | null {
    return localStorage.getItem(this.STORAGE_KEY);
  }
}
