import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamPointsComponent } from './team-points.component';

describe('TeamPointsComponent', () => {
  let component: TeamPointsComponent;
  let fixture: ComponentFixture<TeamPointsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TeamPointsComponent]
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
