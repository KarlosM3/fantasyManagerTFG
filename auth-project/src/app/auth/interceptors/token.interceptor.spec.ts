import { TestBed } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpHandler, HttpRequest, HttpEvent, HttpResponse } from '@angular/common/http';
import { TokenInterceptor } from './token.interceptor';
import { AuthService } from '../services/auth.service';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('TokenInterceptor', () => {
  let httpClient: HttpClient;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    const authServiceMock = jasmine.createSpyObj('AuthService', ['getToken']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptor, multi: true },
        { provide: AuthService, useValue: authServiceMock }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  it('should add Authorization header if token exists', (done) => {
    authServiceSpy.getToken.and.returnValue('test-token');

    // Simula el handler de la cadena de interceptores
    const request = new HttpRequest('GET', '/test');
    const next: HttpHandler = {
      handle: (req: HttpRequest<any>) => {
        expect(req.headers.get('Authorization')).toBe('Bearer test-token');
        // Devuelve un observable simulado
        return of(new HttpResponse({ status: 200 }));
      }
    };

    const interceptor = new TokenInterceptor(authServiceSpy);
    interceptor.intercept(request, next).subscribe(() => done());
  });

  it('should not add Authorization header if token does not exist', (done) => {
    authServiceSpy.getToken.and.returnValue(null);

    const request = new HttpRequest('GET', '/test');
    const next: HttpHandler = {
      handle: (req: HttpRequest<any>) => {
        expect(req.headers.has('Authorization')).toBeFalse();
        return of(new HttpResponse({ status: 200 }));
      }
    };

    const interceptor = new TokenInterceptor(authServiceSpy);
    interceptor.intercept(request, next).subscribe(() => done());
  });
});
