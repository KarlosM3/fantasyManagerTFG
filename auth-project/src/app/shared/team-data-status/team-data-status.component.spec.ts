import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamDataStatusComponent } from './team-data-status.component';

describe('TeamDataStatusComponent', () => {
  let component: TeamDataStatusComponent;
  let fixture: ComponentFixture<TeamDataStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TeamDataStatusComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TeamDataStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
