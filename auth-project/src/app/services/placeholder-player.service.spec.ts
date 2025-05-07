import { TestBed } from '@angular/core/testing';

import { PlaceholderPlayerService } from './placeholder-player.service';

describe('PlaceholderPlayerService', () => {
  let service: PlaceholderPlayerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlaceholderPlayerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
