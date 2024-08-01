import { inject } from '@angular/core';

import { DescopeAuthService } from './descope-auth.service';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { from, of } from 'rxjs';

export const descopeAuthGuard = (route: ActivatedRouteSnapshot) => {
  const authService = inject(DescopeAuthService);
  const router = inject(Router);
  const fallbackUrl = route.data['descopeFallbackUrl'];
  const isAuthenticated = authService.isAuthenticated();
  if (!isAuthenticated && !!fallbackUrl) {
    return from(router.navigate([fallbackUrl]));
  }
  return of(isAuthenticated);
};
