import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { leagueGuard } from './league.guard';

describe('leagueGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => leagueGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
