/* eslint-disable no-console */
import { Component, OnInit } from '@angular/core';
import { DescopeAuthService } from '../../../../angular-sdk/src/lib/services/descope-auth.service';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class HomeComponent implements OnInit {
  projectId: string = environment.descopeProjectId;
  isAuthenticated: boolean = false;
  roles: string[] = [];
  claimsJson: string;
  userName: string = '';
  stepUpConfigured = (environment.descopeStepUpFlowId ?? '').length > 0;
  backendUrl = environment.backendUrl ?? '';

  constructor(
    private router: Router,
    private httpClient: HttpClient,
    private authService: DescopeAuthService
  ) {}

  ngOnInit() {
    this.authService.session$.subscribe((session) => {
      this.isAuthenticated = session.isAuthenticated;
      if (session.sessionToken) {
        this.roles = this.authService.getJwtRoles(session.sessionToken);
      }
    });
    this.authService.session$.subscribe((session) => {
      this.claimsJson = JSON.stringify(session.claims).slice(0, 300);
    });
    this.authService.user$.subscribe((descopeUser) => {
      if (descopeUser.user) {
        this.userName = descopeUser.user.name ?? '';
      }
    });
  }

  login(): void {
    this.router.navigate(['/login']);
  }

  tryByosDemo(): void {
    this.router.navigate(['/byos-demo']);
  }

  logout(): void {
    this.authService.descopeSdk.logout();
  }

  fetchData(): void {
    if (this.backendUrl) {
      this.httpClient
        .get(this.backendUrl, { responseType: 'text' })
        .subscribe((data) => alert(data));
    } else {
      console.warn('Please setup backendUrl in your environment');
    }
  }

  stepUp() {
    this.router.navigate(['/step-up']).catch((err) => console.error(err));
  }

  manageUsers() {
    this.router.navigate(['/manage-users']).catch((err) => console.error(err));
  }

  manageRoles() {
    this.router.navigate(['/manage-roles']).catch((err) => console.error(err));
  }

  manageAccessKeys() {
    this.router
      .navigate(['/manage-access-keys'])
      .catch((err) => console.error(err));
  }

  manageAudit() {
    this.router.navigate(['/manage-audit']).catch((err) => console.error(err));
  }

  myUserProfile() {
    this.router
      .navigate(['/my-user-profile'])
      .catch((err) => console.error(err));
  }

  myApplicationsPortal() {
    this.router
      .navigate(['/my-applications-portal'])
      .catch((err) => console.error(err));
  }
}
