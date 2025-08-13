import { TestBed } from '@angular/core/testing';
import { LeagueGuard } from './league.guard';
import { LeagueService } from '../../modals/create-league-modal/services/create-league.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('LeagueGuard', () => {
  let guard: LeagueGuard;
  let leagueServiceSpy: jasmine.SpyObj<LeagueService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const leagueServiceMock = jasmine.createSpyObj('LeagueService', ['getUserLeagues']);
    const routerMock = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        LeagueGuard,
        { provide: LeagueService, useValue: leagueServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });

    guard = TestBed.inject(LeagueGuard);
    leagueServiceSpy = TestBed.inject(LeagueService) as jasmine.SpyObj<LeagueService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow activation if user has leagues', (done) => {
    leagueServiceSpy.getUserLeagues.and.returnValue(of([{}, {}])); // Simula dos ligas

    guard.canActivate().subscribe(result => {
      expect(result).toBeTrue();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
      done();
    });
  });

  it('should redirect if user has no leagues', (done) => {
    leagueServiceSpy.getUserLeagues.and.returnValue(of([])); // Sin ligas

    guard.canActivate().subscribe(result => {
      expect(result).toBeFalse();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/layouts/home']);
      done();
    });
  });

  it('should redirect if service throws error', (done) => {
    leagueServiceSpy.getUserLeagues.and.returnValue(throwError(() => new Error('error')));

    guard.canActivate().subscribe(result => {
      expect(result).toBeFalse();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/layouts/home']);
      done();
    });
  });
});
