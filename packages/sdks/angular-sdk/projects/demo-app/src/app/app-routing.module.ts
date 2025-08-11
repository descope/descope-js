import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ProtectedComponent } from './protected/protected.component';
import { descopeAuthGuard } from '../../../angular-sdk/src/lib/services/descope-auth.guard';
import { LoginComponent } from './login/login.component';
import { ManageUsersComponent } from './manage-users/manage-users.component';
import { ManageRolesComponent } from './manage-roles/manage-roles.component';
import { ManageAccessKeysComponent } from './manage-access-keys/manage-access-keys.component';
import { ManageAuditComponent } from './manage-audit/manage-audit.component';
import { MyUserProfileComponent } from './my-user-profile/my-user-profile.component';
import { MyApplicationsPortalComponent } from './my-applications-portal/my-applications-portal.component';
import { ByosDemoComponent } from './byos-demo/byos-demo.component';

export const routes: Routes = [
  {
    path: 'step-up',
    component: ProtectedComponent,
    canActivate: [descopeAuthGuard],
    data: { descopeFallbackUrl: '/' }
  },
  { path: 'login', component: LoginComponent },
  { path: 'byos-demo', component: ByosDemoComponent },
  { path: 'manage-users', component: ManageUsersComponent },
  { path: 'manage-roles', component: ManageRolesComponent },
  { path: 'manage-access-keys', component: ManageAccessKeysComponent },
  { path: 'manage-audit', component: ManageAuditComponent },
  { path: 'my-user-profile', component: MyUserProfileComponent },
  { path: 'my-applications-portal', component: MyApplicationsPortalComponent },
  { path: '**', component: HomeComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { enableTracing: false })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
