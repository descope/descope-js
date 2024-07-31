import { Component } from '@angular/core';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

@Component({
  selector: 'app-manage-access-keys',
  templateUrl: './manage-access-keys.component.html'
})
export class ManageAccessKeysComponent {
  theme = (environment.descopeTheme as 'light' | 'dark' | 'os') ?? 'os';
  debugMode = environment.descopeDebugMode ?? false;
  tenant = environment.descopeTenantId ?? '';

  constructor(private _: Router) {}
}
