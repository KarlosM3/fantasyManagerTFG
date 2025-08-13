import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TeamPointsComponent } from './team-points.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

describe('TeamPointsComponent', () => {
  let component: TeamPointsComponent;
  let fixture: ComponentFixture<TeamPointsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [TeamPointsComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { teamPoints: { id: 1, points: 100, teamName: 'Test Team' } } },
            data: of({ teamPoints: { id: 1, points: 100, teamName: 'Test Team' } }) // <- esto es importante
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeamPointsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
