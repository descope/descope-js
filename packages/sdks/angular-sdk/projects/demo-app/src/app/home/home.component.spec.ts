import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeComponent } from './home.component';
import createSdk from '@descope/web-js-sdk';
import mocked = jest.mocked;
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DescopeAuthConfig } from '../../../../angular-sdk/src/lib/types/types';
import { HttpClientTestingModule } from '@angular/common/http/testing';

jest.mock('@descope/web-js-sdk');

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  let mockedCreateSdk: jest.Mock;
  const onSessionTokenChangeSpy = jest.fn();
  const onIsAuthenticatedChangeSpy = jest.fn();
  const onUserChangeSpy = jest.fn();
  const onClaimsChangeSpy = jest.fn();

  beforeEach(async () => {
    mockedCreateSdk = mocked(createSdk);
    mockedCreateSdk.mockReturnValue({
      onSessionTokenChange: onSessionTokenChangeSpy,
      onIsAuthenticatedChange: onIsAuthenticatedChangeSpy,
      onUserChange: onUserChangeSpy,
      onClaimsChange: onClaimsChangeSpy
    });

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, HomeComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        DescopeAuthConfig,
        { provide: DescopeAuthConfig, useValue: { projectId: 'test' } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
