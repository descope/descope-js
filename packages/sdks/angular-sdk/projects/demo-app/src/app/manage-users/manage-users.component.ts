import { Component } from '@angular/core';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

@Component({
  selector: 'app-manage-users',
  templateUrl: './manage-users.component.html'
})
export class ManageUsersComponent {
  theme = (environment.descopeTheme as 'light' | 'dark' | 'os') ?? 'os';
  debugMode = environment.descopeDebugMode ?? false;
  tenant = environment.descopeTenantId ?? '';

  constructor(private _: Router) {}
}
