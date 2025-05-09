import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamModalComponent } from './team-modal.component';

describe('TeamModalComponent', () => {
  let component: TeamModalComponent;
  let fixture: ComponentFixture<TeamModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TeamModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TeamModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
