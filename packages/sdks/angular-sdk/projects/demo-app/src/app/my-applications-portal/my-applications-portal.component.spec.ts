import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyApplicationsPortalComponent } from './my-applications-portal.component';
import createSdk from '@descope/web-js-sdk';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DescopeAuthConfig } from '../../../../angular-sdk/src/lib/types/types';
import mocked = jest.mocked;

jest.mock('@descope/web-js-sdk');

describe('MyApplicationsPortalComponent', () => {
  let component: MyApplicationsPortalComponent;
  let fixture: ComponentFixture<MyApplicationsPortalComponent>;

  let mockedCreateSdk: jest.Mock;

  beforeEach(() => {
    mockedCreateSdk = mocked(createSdk);
    mockedCreateSdk.mockReturnValue({});

    TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [MyApplicationsPortalComponent],
      providers: [
        DescopeAuthConfig,
        { provide: DescopeAuthConfig, useValue: { projectId: 'test' } }
      ]
    });
    fixture = TestBed.createComponent(MyApplicationsPortalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
