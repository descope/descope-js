/* eslint-disable no-console */
// workaround for TS issue https://github.com/microsoft/TypeScript/issues/42873
// eslint-disable-next-line
import type * as _1 from '@descope/core-js-sdk';
import { Injectable } from '@angular/core';
import type { UserResponse } from '@descope/web-js-sdk';
import type * as _2 from 'oidc-client-ts'; // eslint-disable-line
import createSdk from '@descope/web-js-sdk';
import { BehaviorSubject, finalize, Observable, tap } from 'rxjs';
import { observabilify, Observablefied } from '../utils/helpers';
import { baseHeaders, isBrowser } from '../utils/constants';
import { DescopeAuthConfig } from '../types/types';

type DescopeSDK = ReturnType<typeof createSdk>;
type AngularDescopeSDK = Observablefied<DescopeSDK>;

export interface DescopeSession {
  isAuthenticated: boolean;
  isSessionLoading: boolean;
  sessionToken: string | null;
  claims?: Record<string, any>;
}

export type DescopeUser = {
  user?: UserResponse | null;
  isUserLoading: boolean;
};

@Injectable({
  providedIn: 'root'
})
export class DescopeAuthService {
  public descopeSdk: AngularDescopeSDK;
  private readonly sessionSubject: BehaviorSubject<DescopeSession>;
  private readonly userSubject: BehaviorSubject<DescopeUser>;
  readonly session$: Observable<DescopeSession>;
  readonly user$: Observable<DescopeUser>;

  constructor(config: DescopeAuthConfig) {
    this.descopeSdk = observabilify<DescopeSDK>(
      createSdk({
        persistTokens: isBrowser() as true,
        storeLastAuthenticatedUser: isBrowser() as true,
        autoRefresh: isBrowser() as true,
        ...config,
        baseHeaders
      })
    );

    this.sessionSubject = new BehaviorSubject<DescopeSession>({
      isAuthenticated: false,
      isSessionLoading: false,
      sessionToken: '',
      claims: undefined
    });
    this.session$ = this.sessionSubject.asObservable();
    this.userSubject = new BehaviorSubject<DescopeUser>({
      isUserLoading: false
    });
    this.user$ = this.userSubject.asObservable();
    this.descopeSdk.onSessionTokenChange(this.setSession.bind(this));
    this.descopeSdk.onIsAuthenticatedChange(this.setIsAuthenticated.bind(this));
    this.descopeSdk.onUserChange(this.setUser.bind(this));
    this.descopeSdk.onClaimsChange(this.setClaims.bind(this));
  }

  refreshSession(tryRefresh?: boolean) {
    const beforeRefreshSession = this.sessionSubject.value;
    this.sessionSubject.next({
      ...beforeRefreshSession,
      isSessionLoading: true
    });
    return this.descopeSdk.refresh(undefined, tryRefresh).pipe(
      finalize(() => {
        const afterRefreshSession = this.sessionSubject.value;
        this.sessionSubject.next({
          ...afterRefreshSession,
          isSessionLoading: false
        });
      })
    );
  }

  refreshUser() {
    const beforeRefreshUser = this.userSubject.value;
    this.userSubject.next({
      ...beforeRefreshUser,
      isUserLoading: true
    });
    return this.descopeSdk.me().pipe(
      tap((data) => {
        const afterRequestUser = this.userSubject.value;
        if (data.data) {
          this.userSubject.next({
            ...afterRequestUser,
            user: {
              ...data.data
            }
          });
        }
      }),
      finalize(() => {
        const afterRefreshUser = this.userSubject.value;
        this.userSubject.next({
          ...afterRefreshUser,
          isUserLoading: false
        });
      })
    );
  }

  getSessionToken() {
    if (isBrowser()) {
      return (
        this.descopeSdk as AngularDescopeSDK & {
          getSessionToken: () => string | null;
        }
      ).getSessionToken();
    }
    console.warn('Get session token is not supported in SSR');
    return '';
  }

  getRefreshToken() {
    if (isBrowser()) {
      return (
        this.descopeSdk as AngularDescopeSDK & {
          getRefreshToken: () => string | null;
        }
      ).getRefreshToken();
    }
    this.descopeSdk.getJwtPermissions;
    console.warn('Get refresh token is not supported in SSR');
    return '';
  }

  isSessionTokenExpired(token = this.getSessionToken()) {
    if (isBrowser()) {
      return this.descopeSdk.isJwtExpired(token ?? '');
    }
    console.warn('isSessionTokenExpired is not supported in SSR');
    return true;
  }

  isRefreshTokenExpired(token = this.getRefreshToken()) {
    if (isBrowser()) {
      return (
        this.descopeSdk as AngularDescopeSDK & {
          isJwtExpired: (token: string) => boolean | null;
        }
      ).isJwtExpired(token ?? '');
    }
    console.warn('isRefreshTokenExpired is not supported in SSR');
    return true;
  }

  getJwtPermissions(token = this.getSessionToken(), tenant?: string) {
    if (token === null) {
      console.error('Could not get JWT Permissions - not authenticated');
      return [];
    }
    return this.descopeSdk.getJwtPermissions(token, tenant);
  }

  getJwtRoles(token = this.getSessionToken(), tenant?: string) {
    if (token === null) {
      console.error('Could not get JWT Roles - not authenticated');
      return [];
    }
    return this.descopeSdk.getJwtRoles(token, tenant);
  }

  isAuthenticated() {
    return this.sessionSubject.value.isAuthenticated;
  }

  setSession(sessionToken: string | null) {
    const currentSession = this.sessionSubject.value;
    this.sessionSubject.next({
      ...currentSession,
      sessionToken
    });
  }

  setIsAuthenticated(isAuthenticated: boolean) {
    const currentSession = this.sessionSubject.value;
    this.sessionSubject.next({
      ...currentSession,
      isAuthenticated
    });
  }

  setUser(user: UserResponse | null) {
    const currentUser = this.userSubject.value;
    this.userSubject.next({
      isUserLoading: currentUser.isUserLoading,
      user
    });
  }

  setClaims(claims?: DescopeSession['claims']) {
    const currentSession = this.sessionSubject.value;
    this.sessionSubject.next({
      ...currentSession,
      claims
    });
  }
}
