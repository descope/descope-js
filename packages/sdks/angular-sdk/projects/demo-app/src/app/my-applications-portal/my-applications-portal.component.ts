import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { DescopeAuthModule } from '../../../../angular-sdk/src/lib/descope-auth.module';

@Component({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-my-applications-portal',
  templateUrl: './my-applications-portal.component.html',
  styleUrls: ['./my-applications-portal.scss'],
  standalone: true,
  imports: [DescopeAuthModule]
})
export class MyApplicationsPortalComponent {
  theme = (environment.descopeTheme as 'light' | 'dark' | 'os') ?? 'os';
  debugMode = environment.descopeDebugMode ?? false;

  constructor(private router: Router) {}
}
