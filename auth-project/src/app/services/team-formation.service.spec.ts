import { TestBed } from '@angular/core/testing';

import { TeamFormationService } from './team-formation.service';

describe('TeamFormationService', () => {
  let service: TeamFormationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TeamFormationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
