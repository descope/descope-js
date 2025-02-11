import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DescopeAuthModule } from '../../../angular-sdk/src/lib/descope-auth.module';
import { HomeComponent } from './home/home.component';
import { ProtectedComponent } from './protected/protected.component';
import { environment } from '../environments/environment';
import { DescopeAuthService } from 'projects/angular-sdk/src/public-api';
import { zip } from 'rxjs';
import { LoginComponent } from './login/login.component';
import { ManageUsersComponent } from './manage-users/manage-users.component';
import { ManageRolesComponent } from './manage-roles/manage-roles.component';
import { ManageAccessKeysComponent } from './manage-access-keys/manage-access-keys.component';
import { ManageAuditComponent } from './manage-audit/manage-audit.component';
import { MyUserProfileComponent } from './my-user-profile/my-user-profile.component';
import { MyApplicationsPortalComponent } from './my-applications-portal/my-applications-portal.component';
import {
  HttpClientModule,
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';
import { descopeInterceptor } from '../../../angular-sdk/src/lib/services/descope.interceptor';

export function initializeApp(authService: DescopeAuthService) {
  return () => zip([authService.refreshSession(), authService.refreshUser()]);
}

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    ProtectedComponent,
    LoginComponent,
    ManageUsersComponent,
    ManageRolesComponent,
    ManageAccessKeysComponent,
    ManageAuditComponent,
    MyUserProfileComponent,
    MyApplicationsPortalComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    DescopeAuthModule.forRoot({
      projectId: environment.descopeProjectId,
      baseUrl: environment.descopeBaseUrl || '',
      baseStaticUrl: environment.descopeBaseStaticUrl || '',
      baseCdnUrl: environment.descopeBaseCdnUrl || '',
      sessionTokenViaCookie: true
    })
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [DescopeAuthService],
      multi: true
    },
    provideHttpClient(withInterceptors([descopeInterceptor]))
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
