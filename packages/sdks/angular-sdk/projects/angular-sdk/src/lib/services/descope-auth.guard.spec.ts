import { delay, Observable } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { descopeAuthGuard } from './descope-auth.guard';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { DescopeAuthService } from './descope-auth.service';

describe('descopeAuthGuard', () => {
  const authServiceMock = {
    isAuthenticated: jest.fn()
  };

  const routerMock = {
    navigate: jest.fn()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        {
          provide: Router,
          useValue: routerMock
        },
        {
          provide: DescopeAuthService,
          useValue: authServiceMock
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {
                descopeFallbackUrl: '/fallback'
              }
            }
          }
        }
      ]
    });
  });

  it('return true if authenticated', fakeAsync(() => {
    const activatedRoute = TestBed.inject(ActivatedRoute);
    authServiceMock.isAuthenticated.mockReturnValue(true);
    const guardResponse = TestBed.runInInjectionContext(() => {
      return descopeAuthGuard(activatedRoute.snapshot) as Observable<boolean>;
    });

    let guardOutput = null;
    guardResponse
      .pipe(delay(100))
      .subscribe((response) => (guardOutput = response));
    tick(100);

    expect(guardOutput).toBeTruthy();
  }));

  it('navigate to fallbackUrl when not auth', fakeAsync(() => {
    const activatedRoute = TestBed.inject(ActivatedRoute);
    authServiceMock.isAuthenticated.mockReturnValue(false);
    routerMock.navigate.mockReturnValue([]);
    const guardResponse = TestBed.runInInjectionContext(() => {
      return descopeAuthGuard(activatedRoute.snapshot) as Observable<boolean>;
    });

    let guardOutput = null;
    guardResponse
      .pipe(delay(100))
      .subscribe((response) => (guardOutput = response));
    tick(100);

    expect(guardOutput).toBeFalsy();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/fallback']);
  }));
});
