/* eslint-disable no-console */
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { DescopeAuthModule } from '../../../../angular-sdk/src/lib/descope-auth.module';

@Component({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-my-user-profile',
  templateUrl: './my-user-profile.component.html',
  styleUrls: ['./my-user-profile.scss'],
  standalone: true,
  imports: [DescopeAuthModule]
})
export class MyUserProfileComponent {
  theme = (environment.descopeTheme as 'light' | 'dark' | 'os') ?? 'os';
  debugMode = environment.descopeDebugMode ?? false;

  onLogout(e: CustomEvent) {
    console.log('SUCCESSFULLY LOGGED IN FROM WEB COMPONENT', e.detail);
    this.router.navigate(['/login']).catch((err) => console.error(err));
  }

  constructor(private router: Router) {}
}
