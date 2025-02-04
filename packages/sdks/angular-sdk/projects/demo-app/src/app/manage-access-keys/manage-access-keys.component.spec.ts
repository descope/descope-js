import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManageAccessKeysComponent } from './manage-access-keys.component';
import createSdk from '@descope/web-js-sdk';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DescopeAuthConfig } from '../../../../angular-sdk/src/lib/types/types';
import mocked = jest.mocked;

jest.mock('@descope/web-js-sdk');

describe('ManageAccessKeysComponent', () => {
  let component: ManageAccessKeysComponent;
  let fixture: ComponentFixture<ManageAccessKeysComponent>;

  let mockedCreateSdk: jest.Mock;

  beforeEach(async () => {
    mockedCreateSdk = mocked(createSdk);
    mockedCreateSdk.mockReturnValue({});

    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [ManageAccessKeysComponent],
      providers: [
        DescopeAuthConfig,
        { provide: DescopeAuthConfig, useValue: { projectId: 'test' } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ManageAccessKeysComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
