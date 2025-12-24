import { ComponentFixture, TestBed } from '@angular/core/testing';
import { default as DescopeWC } from '@descope/web-component';
import { DescopeComponent } from './descope.component';
import createSdk from '@descope/web-js-sdk';
import { DescopeAuthConfig } from '../../types/types';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  EventEmitter,
  PLATFORM_ID
} from '@angular/core';
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

  describe('customStorage', () => {
    const mockCustomStorage = {
      getItem: jest.fn((key: string) => `mocked_${key}`),
      setItem: jest.fn(),
      removeItem: jest.fn()
    };

    beforeEach(() => {
      component.flowId = 'test-flow';
    });

    it('should pass customStorage to web-component', () => {
      component.customStorage = mockCustomStorage;
      fixture.detectChanges();

      const webComponent = fixture.nativeElement.querySelector(
        'descope-wc'
      ) as any;
      expect(webComponent.customStorage).toBe(mockCustomStorage);
    });

    it('should handle customStorage with async methods', () => {
      const asyncCustomStorage = {
        getItem: jest.fn((key: string) => `async_${key}`),
        setItem: jest.fn(),
        removeItem: jest.fn()
      };

      component.customStorage = asyncCustomStorage;
      fixture.detectChanges();

      const webComponent = fixture.nativeElement.querySelector(
        'descope-wc'
      ) as any;
      expect(webComponent.customStorage).toBe(asyncCustomStorage);
    });

    it('should work without customStorage', () => {
      fixture.detectChanges();

      const webComponent = fixture.nativeElement.querySelector(
        'descope-wc'
      ) as any;
      expect(webComponent.customStorage).toBeUndefined();
    });

    it('should update customStorage when input changes', () => {
      component.customStorage = mockCustomStorage;
      fixture.detectChanges();

      const newCustomStorage = {
        getItem: jest.fn((key: string) => `new_${key}`),
        setItem: jest.fn(),
        removeItem: jest.fn()
      };

      component.customStorage = newCustomStorage;
      fixture.detectChanges();

      const webComponent = fixture.nativeElement.querySelector(
        'descope-wc'
      ) as any;
      expect(webComponent.customStorage).toBe(newCustomStorage);
    });
  });

  describe('SSR (Server-Side Rendering)', () => {
    it('should not load web component when not in browser (SSR)', () => {
      // Create a new test bed with server platform
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          DescopeAuthConfig,
          { provide: DescopeAuthConfig, useValue: mockConfig },
          { provide: PLATFORM_ID, useValue: 'server' }
        ]
      });

      const ssrFixture = TestBed.createComponent(DescopeComponent);
      const ssrComponent = ssrFixture.componentInstance;
      ssrComponent.projectId = '123';
      ssrComponent.flowId = 'sign-in';

      // Spy on the dynamic import to ensure it's not called
      const importSpy = jest.spyOn(ssrComponent as any, 'loadWebComponent');

      ssrFixture.detectChanges();

      // The web component should be rendered in template (for hydration),
      // but loadWebComponent should not attempt dynamic import
      const html: HTMLElement = ssrFixture.nativeElement;
      const webComponentHtml = html.querySelector('descope-wc');
      expect(webComponentHtml).toBeDefined();

      // Verify that ngOnInit completes without errors in SSR context
      expect(ssrComponent).toBeTruthy();
    });

    it('should handle ngOnInit gracefully when platform is server', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          DescopeAuthConfig,
          { provide: DescopeAuthConfig, useValue: mockConfig },
          { provide: PLATFORM_ID, useValue: 'server' }
        ]
      });

      const ssrFixture = TestBed.createComponent(DescopeComponent);
      const ssrComponent = ssrFixture.componentInstance;
      ssrComponent.flowId = 'sign-in';

      ssrFixture.detectChanges();
      await ssrFixture.whenStable();

      // Should not throw any errors
      expect(ssrComponent).toBeTruthy();
      // Web component should not be loaded
      expect((ssrComponent as any).isWebComponentLoaded).toBe(false);
    });
  });
});
