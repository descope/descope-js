import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest
} from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { DescopeAuthService } from './descope-auth.service';
import { DescopeAuthConfig } from '../types/types';
import { isDescopeBridge } from '../utils/constants';

export const descopeInterceptor: HttpInterceptorFn = (request, next) => {
  const config = inject(DescopeAuthConfig);
  const authService = inject(DescopeAuthService);

  function refreshAndRetry(
    request: HttpRequest<unknown>,
    next: HttpHandlerFn,
    error?: HttpErrorResponse
  ) {
    return authService.refreshSession().pipe(
      switchMap((refreshed) => {
        if (refreshed.ok && refreshed.data) {
          const requestWithRefreshedToken = addTokenToRequest(
            request,
            refreshed.data?.sessionJwt
          );
          return next(requestWithRefreshedToken);
        } else {
          return throwError(
            () => error ?? new Error('Could not refresh session!')
          );
        }
      })
    );
  }

  function shouldIntercept(request: HttpRequest<unknown>): boolean {
    if (isDescopeBridge()) return false;
    return (
      (config.pathsToIntercept?.length === 0 ||
        config.pathsToIntercept?.some((path) => request.url.includes(path))) ??
      true
    );
  }

  function addTokenToRequest(
    request: HttpRequest<unknown>,
    token: string
  ): HttpRequest<unknown> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  if (shouldIntercept(request)) {
    const token = authService.getSessionToken();
    if (!token) {
      return refreshAndRetry(request, next);
    }
    const requestWithToken = addTokenToRequest(request, token);
    return next(requestWithToken).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 403) {
          return refreshAndRetry(request, next, error);
        } else {
          return throwError(() => error);
        }
      })
    );
  } else {
    return next(request);
  }
};
