/* eslint-disable no-console */
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER } from '@angular/core';
import { AppComponent } from './app/app.component';
import { routes } from './app/app-routing.module';
import { DescopeAuthService } from 'projects/angular-sdk/src/lib/services/descope-auth.service';
import { descopeInterceptor } from 'projects/angular-sdk/src/lib/services/descope.interceptor';
import { environment } from './environments/environment';
import { zip } from 'rxjs';
import { importProvidersFrom } from '@angular/core';
import { DescopeAuthModule } from 'projects/angular-sdk/src/lib/descope-auth.module';

export function initializeApp(authService: DescopeAuthService) {
  return () => zip([authService.refreshSession(), authService.refreshUser()]);
}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([descopeInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [DescopeAuthService],
      multi: true
    },
    importProvidersFrom(
      DescopeAuthModule.forRoot({
        projectId: environment.descopeProjectId,
        baseUrl: environment.descopeBaseUrl || '',
        baseStaticUrl: environment.descopeBaseStaticUrl || '',
        baseCdnUrl: environment.descopeBaseCdnUrl || '',
        sessionTokenViaCookie: true
      })
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [DescopeAuthService],
      multi: true
    }
  ]
}).catch((err) => console.error(err));
