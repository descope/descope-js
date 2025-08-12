import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProtectedComponent } from './protected.component';
import createSdk from '@descope/web-js-sdk';
import mocked = jest.mocked;
import { DescopeAuthConfig } from '../../../../angular-sdk/src/lib/types/types';
import { NO_ERRORS_SCHEMA } from '@angular/core';

jest.mock('@descope/web-js-sdk');

describe('ProtectedComponent', () => {
  let component: ProtectedComponent;
  let fixture: ComponentFixture<ProtectedComponent>;

  let mockedCreateSdk: jest.Mock;
  const onSessionTokenChangeSpy = jest.fn();
  const onIsAuthenticatedChangeSpy = jest.fn();
  const onUserChangeSpy = jest.fn();

  beforeEach(async () => {
    // Mock CSSStyleSheet.replaceSync for testing environment
    if (!CSSStyleSheet.prototype.replaceSync) {
      CSSStyleSheet.prototype.replaceSync = jest.fn();
    }

    mockedCreateSdk = mocked(createSdk);
    mockedCreateSdk.mockReturnValue({
      onSessionTokenChange: onSessionTokenChangeSpy,
      onIsAuthenticatedChange: onIsAuthenticatedChangeSpy,
      onUserChange: onUserChangeSpy,
      getSessionToken: jest.fn().mockReturnValue('mock-token'),
      getRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
      isJwtExpired: jest.fn().mockReturnValue(false),
      getJwtPermissions: jest.fn().mockReturnValue([]),
      getJwtRoles: jest.fn().mockReturnValue([])
    });

    await TestBed.configureTestingModule({
      imports: [ProtectedComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        DescopeAuthConfig,
        { provide: DescopeAuthConfig, useValue: { projectId: 'test' } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ProtectedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
