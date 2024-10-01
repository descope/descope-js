import {
  CUSTOM_ELEMENTS_SCHEMA,
  ModuleWithProviders,
  NgModule,
  Optional,
  SkipSelf
} from '@angular/core';
import { DescopeComponent } from './components/descope/descope.component';
import { SignInFlowComponent } from './components/sign-in-flow/sign-in-flow.component';
import { SignUpFlowComponent } from './components/sign-up-flow/sign-up-flow.component';
import { SignUpOrInFlowComponent } from './components/sign-up-or-in-flow/sign-up-or-in-flow.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { RoleManagementComponent } from './components/role-management/role-management.component';
import { AccessKeyManagementComponent } from './components/access-key-management/access-key-management.component';
import { AuditManagementComponent } from './components/audit-management/audit-management.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { ApplicationsPortalComponent } from './components/applications-portal/applications-portal.component';
import { DescopeAuthConfig } from './types/types';

@NgModule({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    DescopeComponent,
    SignInFlowComponent,
    SignUpFlowComponent,
    SignUpOrInFlowComponent,
    UserManagementComponent,
    RoleManagementComponent,
    AccessKeyManagementComponent,
    AuditManagementComponent,
    UserProfileComponent,
    ApplicationsPortalComponent
  ],
  exports: [
    DescopeComponent,
    SignInFlowComponent,
    SignUpFlowComponent,
    SignUpOrInFlowComponent,
    UserManagementComponent,
    RoleManagementComponent,
    AccessKeyManagementComponent,
    AuditManagementComponent,
    UserProfileComponent,
    ApplicationsPortalComponent
  ]
})
export class DescopeAuthModule {
  constructor(@Optional() @SkipSelf() parentModule?: DescopeAuthModule) {
    if (parentModule) {
      throw new Error(
        'DescopeAuthModule is already loaded. Import it only once'
      );
    }
  }

  static forRoot(
    config?: DescopeAuthConfig
  ): ModuleWithProviders<DescopeAuthModule> {
    return {
      ngModule: DescopeAuthModule,
      providers: [{ provide: DescopeAuthConfig, useValue: config }]
    };
  }
}
