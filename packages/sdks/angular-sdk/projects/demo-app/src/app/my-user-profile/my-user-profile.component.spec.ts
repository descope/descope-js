import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyUserProfileComponent } from './my-user-profile.component';
import createSdk from '@descope/web-js-sdk';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DescopeAuthConfig } from '../../../../angular-sdk/src/lib/types/types';
import mocked = jest.mocked;

jest.mock('@descope/web-js-sdk');
jest.mock('@descope/user-profile-widget', () => {
  return jest.fn().mockImplementation(() => {
    const element = document.createElement('div');
    element.setAttribute = jest.fn();
    element.addEventListener = jest.fn();
    return element;
  });
});

describe('MyUserProfileComponent', () => {
  let component: MyUserProfileComponent;
  let fixture: ComponentFixture<MyUserProfileComponent>;

  let mockedCreateSdk: jest.Mock;

  beforeEach(async () => {
    // Mock CSSStyleSheet.replaceSync for testing environment
    if (!CSSStyleSheet.prototype.replaceSync) {
      CSSStyleSheet.prototype.replaceSync = jest.fn();
    }

    mockedCreateSdk = mocked(createSdk);
    mockedCreateSdk.mockReturnValue({
      onSessionTokenChange: jest.fn(),
      onIsAuthenticatedChange: jest.fn(),
      onUserChange: jest.fn(),
      getSessionToken: jest.fn().mockReturnValue('mock-token'),
      getRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
      isJwtExpired: jest.fn().mockReturnValue(false),
      getJwtPermissions: jest.fn().mockReturnValue([]),
      getJwtRoles: jest.fn().mockReturnValue([])
    });

    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [MyUserProfileComponent],
      providers: [
        DescopeAuthConfig,
        { provide: DescopeAuthConfig, useValue: { projectId: 'test' } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(MyUserProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
