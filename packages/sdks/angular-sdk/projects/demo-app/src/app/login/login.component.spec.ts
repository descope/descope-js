import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginComponent } from './login.component';
import createSdk from '@descope/web-js-sdk';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DescopeAuthConfig } from '../../../../angular-sdk/src/lib/types/types';
import mocked = jest.mocked;

jest.mock('@descope/web-js-sdk');

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  let mockedCreateSdk: jest.Mock;
  const onSessionTokenChangeSpy = jest.fn();
  const onUserChangeSpy = jest.fn();

  beforeEach(() => {
    mockedCreateSdk = mocked(createSdk);
    mockedCreateSdk.mockReturnValue({
      onSessionTokenChange: onSessionTokenChangeSpy,
      onUserChange: onUserChangeSpy
    });

    TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [LoginComponent],
      providers: [
        DescopeAuthConfig,
        { provide: DescopeAuthConfig, useValue: { projectId: 'test' } }
      ]
    });
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
