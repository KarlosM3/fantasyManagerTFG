import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { LeagueService } from '../../modals/create-league-modal/services/create-league.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LeagueGuard implements CanActivate {
  constructor(
    private leagueService: LeagueService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.leagueService.getUserLeagues().pipe(
      map(leagues => {
        if (leagues.length > 0) {
          return true;
        } else {
          this.router.navigate(['/layouts/home']);
          return false;
        }
      }),
      catchError(() => {
        this.router.navigate(['/layouts/home']);
        return of(false);
      })
    );
  }
}
