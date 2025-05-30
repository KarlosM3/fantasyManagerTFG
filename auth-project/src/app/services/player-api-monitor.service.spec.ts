import { TestBed } from '@angular/core/testing';

import { PlayerApiMonitorService } from './player-api-monitor.service';

describe('PlayerApiMonitorService', () => {
  let service: PlayerApiMonitorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlayerApiMonitorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
