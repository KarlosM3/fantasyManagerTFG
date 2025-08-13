import { TestBed } from '@angular/core/testing';
import { PointsService } from './points.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('PointsService', () => {
  let service: PointsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(PointsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
