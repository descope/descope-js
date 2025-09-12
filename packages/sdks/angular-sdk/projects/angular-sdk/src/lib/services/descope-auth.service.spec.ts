import { TestBed } from '@angular/core/testing';

import { DescopeAuthService } from './descope-auth.service';
import createSdk from '@descope/web-js-sdk';
import mocked = jest.mocked;
import { DescopeAuthConfig } from '../types/types';
import { of, take, toArray } from 'rxjs';

jest.mock('@descope/web-js-sdk');

describe('DescopeAuthService', () => {
  let service: DescopeAuthService;
  let mockedCreateSdk: jest.Mock;
  let windowSpy: jest.SpyInstance;
  const onSessionTokenChangeSpy = jest.fn();
  const onIsAuthenticatedChangeSpy = jest.fn();
  const onUserChangeSpy = jest.fn();
  const onClaimsChangeSpy = jest.fn();
  const getSessionTokenSpy = jest.fn();
  const getRefreshTokenSpy = jest.fn();
  const isJwtExpiredSpy = jest.fn();
  const getJwtPermissionsSpy = jest.fn();
  const getJwtRolesSpy = jest.fn();
  const meSpy = jest.fn();
  const refreshSpy = jest.fn();
  const mockConfig: DescopeAuthConfig = {
    projectId: 'someProject'
  };

  beforeEach(() => {
    mockedCreateSdk = mocked(createSdk);
    windowSpy = jest.spyOn(window, 'window', 'get');

    mockedCreateSdk.mockReturnValue({
      onSessionTokenChange: onSessionTokenChangeSpy,
      onIsAuthenticatedChange: onIsAuthenticatedChangeSpy,
      onUserChange: onUserChangeSpy,
      onClaimsChange: onClaimsChangeSpy,
      getSessionToken: getSessionTokenSpy,
      getRefreshToken: getRefreshTokenSpy,
      isJwtExpired: isJwtExpiredSpy,
      getJwtPermissions: getJwtPermissionsSpy,
      getJwtRoles: getJwtRolesSpy,
      me: meSpy,
      refresh: refreshSpy
    });

    onSessionTokenChangeSpy.mockImplementation((fn) => fn());
    onIsAuthenticatedChangeSpy.mockImplementation((fn) => fn());
    onUserChangeSpy.mockImplementation((fn) => fn());
    onClaimsChangeSpy.mockImplementation((fn) => fn());

    TestBed.configureTestingModule({
      providers: [
        DescopeAuthConfig,
        { provide: DescopeAuthConfig, useValue: mockConfig }
      ]
    });
    service = TestBed.inject(DescopeAuthService);
  });

  afterEach(() => {
    getSessionTokenSpy.mockReset();
    getRefreshTokenSpy.mockReset();
    isJwtExpiredSpy.mockReset();
    getJwtPermissionsSpy.mockReset();
    getJwtRolesSpy.mockReset();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(mockedCreateSdk).toHaveBeenCalledWith(
      expect.objectContaining(mockConfig)
    );
    expect(onSessionTokenChangeSpy).toHaveBeenCalled();
    expect(onIsAuthenticatedChangeSpy).toHaveBeenCalled();
    expect(onUserChangeSpy).toHaveBeenCalled();
    expect(onClaimsChangeSpy).toHaveBeenCalled();
  });

  it('should be created with default autoRefresh option', () => {
    expect(service).toBeTruthy();
    expect(mockedCreateSdk).toHaveBeenCalledWith(
      expect.objectContaining({
        ...mockConfig,
        autoRefresh: true
      })
    );
    expect(onSessionTokenChangeSpy).toHaveBeenCalled();
    expect(onIsAuthenticatedChangeSpy).toHaveBeenCalled();
    expect(onUserChangeSpy).toHaveBeenCalled();
    expect(onClaimsChangeSpy).toHaveBeenCalled();
  });

  it('should be created with custom autoRefresh option', () => {
    const customConfig = { ...mockConfig, autoRefresh: false };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        DescopeAuthConfig,
        { provide: DescopeAuthConfig, useValue: customConfig }
      ]
    });

    const customService = TestBed.inject(DescopeAuthService);

    expect(customService).toBeTruthy();
    expect(mockedCreateSdk).toHaveBeenCalledWith(
      expect.objectContaining({
        ...customConfig,
        autoRefresh: false
      })
    );
  });

  describe('getSessionToken', () => {
    it('should call getSessionToken from sdk', () => {
      const token = 'abcd';
      getSessionTokenSpy.mockReturnValueOnce(token);
      const result = service.getSessionToken();
      expect(getSessionTokenSpy).toHaveBeenCalled();
      expect(result).toStrictEqual(token);
    });

    it('should warn when using getSessionToken in non browser environment', () => {
      const warnSpy = jest.spyOn(console, 'warn');
      windowSpy.mockImplementationOnce(() => undefined);

      service.getSessionToken();

      expect(warnSpy).toHaveBeenCalledWith(
        'Get session token is not supported in SSR'
      );
      expect(getSessionTokenSpy).not.toHaveBeenCalled();
    });
  });

  describe('getRefreshToken', () => {
    it('should call getRefreshToken from sdk', () => {
      const token = 'abcd';
      getRefreshTokenSpy.mockReturnValueOnce(token);
      const result = service.getRefreshToken();
      expect(getRefreshTokenSpy).toHaveBeenCalled();
      expect(result).toStrictEqual(token);
    });

    it('should warn when using getRefreshToken in non browser environment', () => {
      const warnSpy = jest.spyOn(console, 'warn');
      windowSpy.mockImplementationOnce(() => undefined);

      service.getRefreshToken();

      expect(warnSpy).toHaveBeenCalledWith(
        'Get refresh token is not supported in SSR'
      );
      expect(getRefreshTokenSpy).not.toHaveBeenCalled();
    });
  });

  describe('isSessionTokenExpired', () => {
    it('should call isSessionTokenExpired from sdk', () => {
      const token = 'abcd';
      getSessionTokenSpy.mockReturnValueOnce(token);
      service.isSessionTokenExpired();
      expect(getSessionTokenSpy).toHaveBeenCalled();
      expect(isJwtExpiredSpy).toHaveBeenCalledWith(token);
    });

    it('should warn when using isSessionTokenExpired in non browser environment', () => {
      const warnSpy = jest.spyOn(console, 'warn');
      windowSpy.mockImplementationOnce(() => undefined);

      service.isSessionTokenExpired('some token');
      expect(warnSpy).toHaveBeenCalledWith(
        'isSessionTokenExpired is not supported in SSR'
      );
      expect(isJwtExpiredSpy).not.toHaveBeenCalled();
    });
  });

  describe('isRefreshTokenExpired', () => {
    it('should call isRefreshTokenExpired from sdk', () => {
      const token = 'abcd';
      getRefreshTokenSpy.mockReturnValueOnce(token);
      service.isRefreshTokenExpired();
      expect(getRefreshTokenSpy).toHaveBeenCalled();
      expect(isJwtExpiredSpy).toHaveBeenCalledWith(token);
    });

    it('should warn when using isRefreshTokenExpired in non browser environment', () => {
      const warnSpy = jest.spyOn(console, 'warn');
      windowSpy.mockImplementationOnce(() => undefined);

      service.isRefreshTokenExpired('some token');
      expect(warnSpy).toHaveBeenCalledWith(
        'isRefreshTokenExpired is not supported in SSR'
      );
      expect(isJwtExpiredSpy).not.toHaveBeenCalled();
    });
  });

  describe('getJwtPermissions', () => {
    it('should return permissions for token from sdk', () => {
      const permissions = ['edit'];
      getJwtPermissionsSpy.mockReturnValueOnce(permissions);
      const result = service.getJwtPermissions('token');
      expect(getJwtPermissionsSpy).toHaveBeenCalledWith('token', undefined);
      expect(result).toStrictEqual(permissions);
    });

    it('should return empty array and log error when there is no token', () => {
      const errorSpy = jest.spyOn(console, 'error');
      getSessionTokenSpy.mockReturnValueOnce(null);
      const result = service.getJwtPermissions();
      expect(errorSpy).toHaveBeenCalledWith(
        'Could not get JWT Permissions - not authenticated'
      );
      expect(getJwtPermissionsSpy).not.toHaveBeenCalled();
      expect(result).toStrictEqual([]);
    });
  });

  describe('getJwtRoles', () => {
    it('should return roles for token from sdk', () => {
      const roles = ['admin'];
      getJwtRolesSpy.mockReturnValueOnce(roles);
      const result = service.getJwtRoles('token');
      expect(getJwtRolesSpy).toHaveBeenCalledWith('token', undefined);
      expect(result).toStrictEqual(roles);
    });

    it('should return empty array and log error when there is no token', () => {
      const errorSpy = jest.spyOn(console, 'error');
      getSessionTokenSpy.mockReturnValueOnce(null);
      const result = service.getJwtRoles();
      expect(errorSpy).toHaveBeenCalledWith(
        'Could not get JWT Roles - not authenticated'
      );
      expect(getJwtRolesSpy).not.toHaveBeenCalled();
      expect(result).toStrictEqual([]);
    });
  });

  describe('refreshSession', () => {
    it('correctly handle descopeSession stream when session is successfully refreshed', (done: jest.DoneCallback) => {
      refreshSpy.mockReturnValueOnce(
        of({
          ok: true,
          data: { sessionJwt: 'newToken', sessionExpiration: 1663190468 }
        })
      );
      // Taking 3 values from stream: first is initial value, next 2 are the result of refreshSession
      service.session$.pipe(take(3), toArray()).subscribe({
        next: (result) => {
          expect(result.slice(1)).toStrictEqual([
            expect.objectContaining({
              isSessionLoading: true
            }),
            expect.objectContaining({
              isSessionLoading: false
            })
          ]);
          done();
        },
        error: (err) => {
          done.fail(err);
        }
      });
      service.refreshSession().subscribe();
    });

    it('correctly handle descopeSession stream when refresh session failed', (done: jest.DoneCallback) => {
      refreshSpy.mockReturnValueOnce(
        of({ ok: false, data: { sessionJwt: 'newToken' } })
      );
      // Taking 3 values from stream: first is initial value, next 2 are the result of refreshSession
      service.session$.pipe(take(3), toArray()).subscribe({
        next: (result) => {
          expect(result.slice(1)).toStrictEqual([
            expect.objectContaining({
              isSessionLoading: true
            }),
            expect.objectContaining({
              isSessionLoading: false
            })
          ]);
          done();
        },
        error: (err) => {
          done.fail(err);
        }
      });
      service.refreshSession().subscribe();
    });
  });

  describe('refreshUser', () => {
    it('correctly handle descopeUser stream when user is successfully refreshed', (done: jest.DoneCallback) => {
      meSpy.mockReturnValueOnce(of({ ok: true, data: { name: 'test' } }));
      // Taking 4 values from stream: first is initial value, next 3 are the result of refreshUser
      service.user$.pipe(take(4), toArray()).subscribe({
        next: (result) => {
          expect(result.slice(1)).toStrictEqual([
            { isUserLoading: true, user: undefined },
            { isUserLoading: true, user: { name: 'test' } },
            { isUserLoading: false, user: { name: 'test' } }
          ]);
          done();
        },
        error: (err) => {
          done.fail(err);
        }
      });
      service.refreshUser().subscribe();
    });

    it('correctly handle descopeUser stream when refresh session failed', (done: jest.DoneCallback) => {
      meSpy.mockReturnValueOnce(of({ ok: false }));
      // Taking 3 values from stream: first is initial value, next 2 are the result of refreshUser
      service.user$.pipe(take(3), toArray()).subscribe({
        next: (result) => {
          expect(result.slice(1)).toStrictEqual([
            { isUserLoading: true, user: undefined },
            { isUserLoading: false, user: undefined }
          ]);
          done();
        },
        error: (err) => {
          done.fail(err);
        }
      });
      service.refreshUser().subscribe();
    });
  });
});
