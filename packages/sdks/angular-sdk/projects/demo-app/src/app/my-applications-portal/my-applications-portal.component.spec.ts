import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyApplicationsPortalComponent } from './my-applications-portal.component';
import createSdk from '@descope/web-js-sdk';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DescopeAuthConfig } from '../../../../angular-sdk/src/lib/types/types';
import mocked = jest.mocked;

jest.mock('@descope/web-js-sdk');
jest.mock('@descope/applications-portal-widget', () => {
  return jest.fn().mockImplementation(() => {
    const element = document.createElement('div');
    element.setAttribute = jest.fn();
    element.addEventListener = jest.fn();
    return element;
  });
});

describe('MyApplicationsPortalComponent', () => {
  let component: MyApplicationsPortalComponent;
  let fixture: ComponentFixture<MyApplicationsPortalComponent>;

  let mockedCreateSdk: jest.Mock;

  beforeEach(async () => {
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
      imports: [MyApplicationsPortalComponent],
      providers: [
        DescopeAuthConfig,
        { provide: DescopeAuthConfig, useValue: { projectId: 'test' } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(MyApplicationsPortalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
