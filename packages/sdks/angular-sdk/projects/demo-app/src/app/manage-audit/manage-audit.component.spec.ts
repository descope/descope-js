import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManageAuditComponent } from './manage-audit.component';
import createSdk from '@descope/web-js-sdk';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DescopeAuthConfig } from '../../../../angular-sdk/src/lib/types/types';
import mocked = jest.mocked;

jest.mock('@descope/web-js-sdk');

describe('ManageAuditComponent', () => {
  let component: ManageAuditComponent;
  let fixture: ComponentFixture<ManageAuditComponent>;

  let mockedCreateSdk: jest.Mock;

  beforeEach(() => {
    mockedCreateSdk = mocked(createSdk);
    mockedCreateSdk.mockReturnValue({});

    TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [ManageAuditComponent],
      providers: [
        DescopeAuthConfig,
        { provide: DescopeAuthConfig, useValue: { projectId: 'test' } }
      ]
    });
    fixture = TestBed.createComponent(ManageAuditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
