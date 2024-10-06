import { Component, OnInit } from '@angular/core';
import { DescopeAuthService } from '../../../../angular-sdk/src/lib/services/descope-auth.service';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  projectId: string = environment.descopeProjectId;
  isAuthenticated: boolean = false;
  roles: string[] = [];
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
    this.authService.user$.subscribe((descopeUser) => {
      if (descopeUser.user) {
        this.userName = descopeUser.user.name ?? '';
      }
    });
  }

  login() {
    this.router.navigate(['/login']).catch((err) => console.error(err));
  }

  logout() {
    this.authService.descopeSdk.logout();
  }

  fetchData() {
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
