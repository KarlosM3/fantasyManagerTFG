import { TestBed } from '@angular/core/testing';

import { PlayerBadgeService } from './player-badge.service';

describe('PlayerBadgeService', () => {
  let service: PlayerBadgeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlayerBadgeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
