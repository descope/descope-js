import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyUserProfileComponent } from './my-user-profile.component';
import createSdk from '@descope/web-js-sdk';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DescopeAuthConfig } from '../../../../angular-sdk/src/lib/types/types';
import mocked = jest.mocked;

jest.mock('@descope/web-js-sdk');

describe('MyUserProfileComponent', () => {
  let component: MyUserProfileComponent;
  let fixture: ComponentFixture<MyUserProfileComponent>;

  let mockedCreateSdk: jest.Mock;

  beforeEach(() => {
    mockedCreateSdk = mocked(createSdk);
    mockedCreateSdk.mockReturnValue({});

    TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [MyUserProfileComponent],
      providers: [
        DescopeAuthConfig,
        { provide: DescopeAuthConfig, useValue: { projectId: 'test' } }
      ]
    });
    fixture = TestBed.createComponent(MyUserProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
