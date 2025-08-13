import { TestBed } from '@angular/core/testing';

import { PlayerApiMonitorService } from './player-api-monitor.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('PlayerApiMonitorService', () => {
  let service: PlayerApiMonitorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(PlayerApiMonitorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
