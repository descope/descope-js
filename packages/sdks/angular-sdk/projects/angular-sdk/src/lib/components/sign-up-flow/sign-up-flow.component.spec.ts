import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SignUpFlowComponent } from './sign-up-flow.component';
import { DescopeComponent } from '../descope/descope.component';
import { ngMocks } from 'ng-mocks';
import createSdk from '@descope/web-js-sdk';
import { DescopeAuthConfig } from '../../types/types';
import mocked = jest.mocked;

jest.mock('@descope/web-js-sdk');
jest.mock('@descope/web-component', () => {
  return jest.fn(() => {
    // Create a mock DOM element
    return document.createElement('descope-wc');
  });
});
describe('SignUpFlowComponent', () => {
  let component: SignUpFlowComponent;
  let fixture: ComponentFixture<SignUpFlowComponent>;
  let mockedCreateSdk: jest.Mock;

  beforeEach(() => {
    mockedCreateSdk = mocked(createSdk);

    mockedCreateSdk.mockReturnValue({
      onSessionTokenChange: jest.fn(),
      onIsAuthenticatedChange: jest.fn(),
      onUserChange: jest.fn(),
      onClaimsChange: jest.fn()
    });

    TestBed.configureTestingModule({
      providers: [
        DescopeAuthConfig,
        {
          provide: DescopeAuthConfig,
          useValue: {
            projectId: 'someProject'
          }
        }
      ]
    });
    fixture = TestBed.createComponent(SignUpFlowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and be correctly configured', () => {
    expect(component).toBeTruthy();
    const mockComponent =
      ngMocks.find<DescopeComponent>('[flowId=sign-up]').componentInstance;
    expect(mockComponent.flowId).toStrictEqual('sign-up');
  });
});
