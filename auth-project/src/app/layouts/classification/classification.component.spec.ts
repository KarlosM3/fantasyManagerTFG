import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { ClassificationComponent } from './classification.component';
import {of} from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';

describe('ClassificationComponent', () => {
  let component: ClassificationComponent;
  let fixture: ComponentFixture<ClassificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      declarations: [ClassificationComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ leagueId: '1' }),
            data: of({ classification: { id: 1, name: 'Test Classification' } }),
            snapshot: { data: { classification: { id: 1, name: 'Test Classification' } } }
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClassificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
