import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CreateLeagueModalComponent } from './create-league-modal.component';

describe('CreateLeagueModalComponent', () => {
  let component: CreateLeagueModalComponent;
  let fixture: ComponentFixture<CreateLeagueModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [CreateLeagueModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateLeagueModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
