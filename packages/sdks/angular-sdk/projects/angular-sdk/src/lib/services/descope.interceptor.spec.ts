import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';
import { of } from 'rxjs';
import { DescopeAuthService } from './descope-auth.service';
import { DescopeAuthConfig } from '../types/types';
import createSdk from '@descope/web-js-sdk';
import { descopeInterceptor } from './descope.interceptor';
import mocked = jest.mocked;

jest.mock('@descope/web-js-sdk');

describe('DescopeInterceptor', () => {
  let authService: DescopeAuthService;
  let httpTestingController: HttpTestingController;
  let httpClient: HttpClient;
  let mockedCreateSdk: jest.Mock;

  beforeEach(() => {
    mockedCreateSdk = mocked(createSdk);
    mockedCreateSdk.mockReturnValue({
      onSessionTokenChange: jest.fn(),
      onIsAuthenticatedChange: jest.fn(),
      onUserChange: jest.fn(),
      onClaimsChange: jest.fn()
    });

    TestBed.configureTestingModule({
      providers: [
        DescopeAuthService,
        {
          provide: DescopeAuthConfig,
          useValue: { pathsToIntercept: ['/api'], projectId: 'test' }
        },
        provideHttpClient(withInterceptors([descopeInterceptor])),
        provideHttpClientTesting()
      ]
    });

    authService = TestBed.inject(DescopeAuthService);
    httpTestingController = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should intercept requests for specified paths', () => {
    jest.spyOn(authService, 'getSessionToken').mockReturnValue('fakeToken');

    httpClient.get('/api/data').subscribe();
    httpClient.get('/other').subscribe();

    const req1 = httpTestingController.expectOne('/api/data');
    const req2 = httpTestingController.expectOne('/other');

    expect(req1.request.headers.get('Authorization')).toEqual(
      'Bearer fakeToken'
    );
    expect(req2.request.headers.get('Authorization')).toEqual(null);
    req1.flush({});
    req2.flush({});
  });

  it('should refresh token and retry request on 401 or 403 error', () => {
    jest.spyOn(authService, 'getSessionToken').mockReturnValue(null);
    const refreshSessionSpy = jest
      .spyOn(authService, 'refreshSession')
      .mockReturnValue(
        of({
          ok: true,
          data: {
            sessionJwt: 'newToken',
            sessionExpiration: 1663190468,
            claims: {}
          }
        })
      );

    httpClient.get('/api/data').subscribe();

    const req = httpTestingController.expectOne('/api/data');

    expect(req.request.headers.get('Authorization')).toEqual('Bearer newToken');
    expect(refreshSessionSpy).toHaveBeenCalled();
    req.flush({}, { status: 401, statusText: 'Not authorized' });
  });

  it('should throw an error if refreshing the session fails', () => {
    jest.spyOn(authService, 'getSessionToken').mockReturnValue(null);
    jest
      .spyOn(authService, 'refreshSession')
      .mockReturnValue(of({ ok: false, data: undefined }));

    httpClient.get('/api/data').subscribe({
      next: () => {},
      error: (error) => {
        expect(error.message).toEqual('Could not refresh session!');
      },
      complete: () => {}
    });

    httpTestingController.expectNone('/api/data');
  });
});
