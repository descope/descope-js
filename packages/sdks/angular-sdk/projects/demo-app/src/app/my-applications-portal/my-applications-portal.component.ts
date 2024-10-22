import { Component } from '@angular/core';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

@Component({
  selector: 'app-my-applications-portal',
  templateUrl: './my-applications-portal.component.html',
  styleUrls: ['./my-applications-portal.scss']
})
export class MyApplicationsPortalComponent {
  theme = (environment.descopeTheme as 'light' | 'dark' | 'os') ?? 'os';
  debugMode = environment.descopeDebugMode ?? false;

  constructor(private router: Router) {}
}
