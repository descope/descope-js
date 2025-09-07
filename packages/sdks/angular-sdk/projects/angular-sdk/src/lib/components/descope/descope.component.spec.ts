import { ComponentFixture, TestBed } from '@angular/core/testing';
import { default as DescopeWC } from '@descope/web-component';
import { DescopeComponent } from './descope.component';
import createSdk from '@descope/web-js-sdk';
import { DescopeAuthConfig } from '../../types/types';
import { CUSTOM_ELEMENTS_SCHEMA, EventEmitter } from '@angular/core';
import mocked = jest.mocked;

jest.mock('@descope/web-js-sdk');
//Mock DescopeWebComponent
jest.mock('@descope/web-component', () => {
  return jest.fn(() => {
    // Create a mock DOM element
    return document.createElement('descope-wc');
  });
});

describe('DescopeComponent', () => {
  let component: DescopeComponent;
  let fixture: ComponentFixture<DescopeComponent>;
  let mockedCreateSdk: jest.Mock;
  const onSessionTokenChangeSpy = jest.fn();
  const onIsAuthenticatedChangeSpy = jest.fn();
  const onUserChangeSpy = jest.fn();
  const onClaimsChangeSpy = jest.fn();
  const afterRequestHooksSpy = jest.fn();
  const mockConfig: DescopeAuthConfig = {
    projectId: 'someProject'
  };

  beforeEach(() => {
    mockedCreateSdk = mocked(createSdk);

    mockedCreateSdk.mockReturnValue({
      onSessionTokenChange: onSessionTokenChangeSpy,
      onIsAuthenticatedChange: onIsAuthenticatedChangeSpy,
      onUserChange: onUserChangeSpy,
      onClaimsChange: onClaimsChangeSpy,
      httpClient: {
        hooks: {
          afterRequest: afterRequestHooksSpy
        }
      }
    });

    TestBed.configureTestingModule({
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        DescopeAuthConfig,
        { provide: DescopeAuthConfig, useValue: mockConfig }
      ]
    });

    fixture = TestBed.createComponent(DescopeComponent);
    component = fixture.componentInstance;
    component.projectId = '123';
    component.flowId = 'sign-in';
    component.locale = 'en-US';
    component.success = new EventEmitter<CustomEvent>();
    component.error = new EventEmitter<CustomEvent>();
    component.styleId = 'style-1';
    component.logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    component.errorTransformer = jest.fn();
    component.onScreenUpdate = jest.fn();
    component.client = {};
    component.form = {};
    component.storeLastAuthenticatedUser = true;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    const html: HTMLElement = fixture.nativeElement;
    const webComponentHtml = html.querySelector('descope-wc');
    expect(webComponentHtml).toBeDefined();

    expect(DescopeWC.sdkConfigOverrides).toEqual({
      baseHeaders: {
        'x-descope-sdk-name': 'angular',
        'x-descope-sdk-version': expect.stringMatching(/^\d+\.\d+\.\d+$/)
      },
      persistTokens: false,
      hooks: {
        beforeRequest: undefined
      }
    });
  });

  it('should correctly setup attributes based on inputs', () => {
    const html: HTMLElement = fixture.nativeElement;
    const webComponentHtml = html.querySelector('descope-wc')!;
    expect(webComponentHtml.getAttribute('project-id')).toStrictEqual('123');
    expect(webComponentHtml.getAttribute('flow-id')).toStrictEqual('sign-in');
    expect(webComponentHtml.getAttribute('locale')).toStrictEqual('en-US');
    expect(webComponentHtml.getAttribute('logger')).toBeDefined();
    expect(webComponentHtml.getAttribute('error-transformer')).toBeDefined();
    expect(webComponentHtml.getAttribute('redirect-url')).toBeNull();
    expect(webComponentHtml.getAttribute('style-id')).toBe('style-1');
    expect(
      webComponentHtml?.getAttribute('store-last-authenticated-user')
    ).toEqual('true');
  });

  it('should emit success when web component emits success', () => {
    const html: HTMLElement = fixture.nativeElement;
    const webComponentHtml = html.querySelector('descope-wc')!;

    const event = {
      detail: { user: { name: 'user1' }, sessionJwt: 'session1' }
    };
    component.success.subscribe((e) => {
      expect(afterRequestHooksSpy).toHaveBeenCalled();
      expect(e.detail).toHaveBeenCalledWith(event.detail);
    });
    webComponentHtml.dispatchEvent(new CustomEvent('success', event));
  });

  it('should emit error when web component emits error', () => {
    const html: HTMLElement = fixture.nativeElement;
    const webComponentHtml = html.querySelector('descope-wc')!;

    const event = {
      detail: {
        errorCode: 'someError',
        errorDescription: 'someErrorDescription'
      }
    };
    component.error.subscribe((e) => {
      expect(e.detail).toEqual(event.detail);
    });
    webComponentHtml.dispatchEvent(new CustomEvent('error', event));
  });

  it('should emit ready when web component emits ready', () => {
    const spy = jest.spyOn(component.ready, 'emit');

    const html: HTMLElement = fixture.nativeElement;
    const webComponentHtml = html.querySelector('descope-wc')!;

    webComponentHtml.dispatchEvent(new CustomEvent('ready', {}));

    expect(spy).toHaveBeenCalled();
  });
});
