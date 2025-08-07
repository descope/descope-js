import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { DescopeAuthModule } from '../../../../angular-sdk/src/lib/descope-auth.module';
@Component({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-manage-users',
  templateUrl: './manage-users.component.html',
  standalone: true,
  imports: [DescopeAuthModule]
})
export class ManageUsersComponent {
  theme = (environment.descopeTheme as 'light' | 'dark' | 'os') ?? 'os';
  debugMode = environment.descopeDebugMode ?? false;
  tenant = environment.descopeTenantId ?? '';

  constructor(private _: Router) {}
}
