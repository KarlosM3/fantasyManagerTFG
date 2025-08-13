import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JoinLeagueComponent } from './join-league.component';
import { SharedModule } from '../../shared/shared.module';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';


describe('JoinLeagueComponent', () => {
  let component: JoinLeagueComponent;
  let fixture: ComponentFixture<JoinLeagueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [JoinLeagueComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => {
                  if (key === 'leagueId') return '1';
                  return null;
                }
              },
              data: { league: { id: 1, name: 'Test League' } }
            },
            data: of({ league: { id: 1, name: 'Test League' } }),
            params: of({})
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JoinLeagueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
