/* eslint-disable no-console */
import { Component } from '@angular/core';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

@Component({
  selector: 'app-my-user-profile',
  templateUrl: './my-user-profile.component.html',
  styleUrls: ['./my-user-profile.scss']
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
