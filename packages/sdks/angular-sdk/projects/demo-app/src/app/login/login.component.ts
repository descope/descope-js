/* eslint-disable no-console */
import { Component } from '@angular/core';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html'
})
export class LoginComponent {
  flowId = environment.descopeFlowId ?? 'sign-up-or-in';
  theme = (environment.descopeTheme as 'light' | 'dark' | 'os') ?? 'os';
  telemetryKey = environment.descopeTelemetryKey ?? '';
  debugMode = environment.descopeDebugMode ?? false;
  tenantId = environment.descopeTenantId ?? '';
  locale = environment.descopeLocale ?? '';
  redirectUrl = environment.descopeRedirectUrl ?? '';

  isLoading = true;

  constructor(private router: Router) {}

  errorTransformer = (error: { text: string; type: string }): string => {
    const translationMap: { [key: string]: string } = {
      SAMLStartFailed: 'Failed to start SAML flow'
    };
    return translationMap[error.type] || error.text;
  };

  onSuccess(e: CustomEvent) {
    console.log('SUCCESSFULLY LOGGED IN FROM WEB COMPONENT', e.detail);
    this.router.navigate(['/']).catch((err) => console.error(err));
  }

  onError(e: CustomEvent) {
    console.log('ERROR FROM LOG IN FLOW FROM WEB COMPONENT', e);
  }

  onReady() {
    this.isLoading = false;
  }
}
