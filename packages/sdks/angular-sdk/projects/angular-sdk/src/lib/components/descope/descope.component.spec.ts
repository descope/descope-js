import { ComponentFixture, TestBed } from '@angular/core/testing';
import { default as DescopeWC } from '@descope/web-component';
import { DescopeComponent } from './descope.component';
import createSdk from '@descope/web-js-sdk';
import { DescopeAuthConfig } from '../../types/types';
import { DescopeAuthService } from '../../services/descope-auth.service';
import {
  Component,
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
  // The real afterRequest hook returns a promise, and the success handler pipes
  // it through rxjs `from`, so the mock has to return one too.
  const afterRequestHooksSpy = jest.fn(() => Promise.resolve());
  const mockConfig: DescopeAuthConfig = {
    projectId: 'someProject'
  };

  // The element is created in ngOnInit, after the dynamic import resolves, so it
  // is not in the DOM until the task queue drains. fixture.whenStable() is not
  // enough here - it can return before that continuation has run.
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(async () => {
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
    await flush();
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

  it('should emit success when web component emits success', async () => {
    const html: HTMLElement = fixture.nativeElement;
    const webComponentHtml = html.querySelector('descope-wc')!;

    const event = {
      detail: { user: { name: 'user1' }, sessionJwt: 'session1' }
    };
    const emitted: CustomEvent[] = [];
    component.success.subscribe((e) => {
      emitted.push(e);
    });
    webComponentHtml.dispatchEvent(new CustomEvent('success', event));
    // The handler pipes the afterRequest promise through rxjs before emitting,
    // so don't assume the output has arrived by the time dispatch returns.
    await flush();

    expect(afterRequestHooksSpy).toHaveBeenCalled();
    expect(emitted).toHaveLength(1);
    expect(emitted[0].detail).toEqual(event.detail);
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

  // Regression tests for descope/etc#18415. The custom element reads project-id
  // in its connectedCallback, so the attribute has to be there before the
  // element is connected. It used to be missing on every mount after the first,
  // which left the flow stuck loading forever with no error.
  describe('attributes are set before the element connects', () => {
    type ConnectRecord = {
      projectId: string | null;
      flowId: string | null;
      projected: string | null;
    };
    const connects: ConnectRecord[] = [];

    // A stand-in for descope-wc that records what it can see when connected.
    class ProbeElement extends HTMLElement {
      connectedCallback() {
        connects.push({
          projectId: this.getAttribute('project-id'),
          flowId: this.getAttribute('flow-id'),
          projected: this.textContent?.trim() || null
        });
      }
    }

    const mountProbe = async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          DescopeAuthConfig,
          { provide: DescopeAuthConfig, useValue: mockConfig }
        ]
      });
      const f = TestBed.createComponent(DescopeComponent);
      f.componentInstance.projectId = 'P_TEST';
      f.componentInstance.flowId = 'sign-in';
      f.detectChanges();
      await flush();
      f.detectChanges();
      return f;
    };

    beforeAll(() => {
      // The real descope-wc is mocked away in this suite, so the element name
      // used by the component is registered here instead. Registering it is
      // what makes the test meaningful: an unregistered element never upgrades,
      // so it would never read its attributes and the bug would not show.
      if (!customElements.get('descope-wc')) {
        customElements.define('descope-wc', ProbeElement);
      }
    });

    beforeEach(() => {
      connects.length = 0;
    });

    it('sets project-id and flow-id before connectedCallback runs', async () => {
      await mountProbe();

      expect(connects).toHaveLength(1);
      expect(connects[0].projectId).toBe('P_TEST');
      expect(connects[0].flowId).toBe('sign-in');
    });

    it('sets them on remount too, when the element is already defined', async () => {
      const first = await mountProbe();
      first.destroy();
      connects.length = 0;

      // This is the case the customer hit: by now descope-wc is defined, so the
      // element upgrades the moment it is connected.
      await mountProbe();

      expect(connects).toHaveLength(1);
      expect(connects[0].projectId).toBe('P_TEST');
      expect(connects[0].flowId).toBe('sign-in');
    });

    it('removes the element and disconnects it on destroy', async () => {
      const f = await mountProbe();
      const element = f.nativeElement.querySelector('descope-wc');
      expect(element).toBeTruthy();

      f.destroy();

      // isConnected going false is what makes the browser run the web
      // component's disconnectedCallback so it can clean up after itself.
      expect(element.isConnected).toBe(false);
      expect(f.nativeElement.querySelector('descope-wc')).toBeNull();
    });

    it('projects content into the element (custom screens)', async () => {
      @Component({
        standalone: true,
        imports: [DescopeComponent],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        // the binding form is required - a static flowId="..." attribute is
        // lowercased by the HTML parser and would not match the
        // `descope[flowId]` selector
        template: `<descope [flowId]="'sign-in'"
          ><span class="custom-screen">CUSTOM</span></descope
        >`
      })
      class HostComponent {}

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          DescopeAuthConfig,
          { provide: DescopeAuthConfig, useValue: mockConfig }
        ]
      });
      const f = TestBed.createComponent(HostComponent);
      f.detectChanges();
      await flush();
      f.detectChanges();

      const element = f.nativeElement.querySelector('descope-wc');
      expect(element.querySelector('.custom-screen')).toBeTruthy();
      // the projected content must be there when the element connects, not later
      expect(connects[0].projected).toBe('CUSTOM');
    });

    it('updates an attribute when an input changes, and removes it when unset', async () => {
      const f = await mountProbe();
      const element = f.nativeElement.querySelector('descope-wc');

      f.componentInstance.locale = 'en-US';
      f.detectChanges();
      expect(element.getAttribute('locale')).toBe('en-US');

      f.componentInstance.locale = undefined as unknown as string;
      f.detectChanges();
      expect(element.getAttribute('locale')).toBeNull();
    });

    it('builds nothing when destroyed before the import resolves', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          DescopeAuthConfig,
          { provide: DescopeAuthConfig, useValue: mockConfig }
        ]
      });
      const f = TestBed.createComponent(DescopeComponent);
      f.componentInstance.flowId = 'sign-in';

      f.detectChanges(); // ngOnInit starts and hits the await
      f.destroy(); // destroyed before the continuation runs
      await flush();

      // The continuation must not build the view: inserting into a destroyed
      // ViewContainerRef throws, and nothing would ever clean it up.
      expect(connects).toHaveLength(0);
      expect(f.nativeElement.querySelector('descope-wc')).toBeNull();
    });

    it('still renders the element when loading the web component fails', async () => {
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          DescopeAuthConfig,
          { provide: DescopeAuthConfig, useValue: mockConfig }
        ]
      });
      const f = TestBed.createComponent(DescopeComponent);
      f.componentInstance.projectId = 'P_TEST';
      f.componentInstance.flowId = 'sign-in';

      // Makes loadWebComponent throw inside its own try/catch.
      Object.defineProperty(TestBed.inject(DescopeAuthService), 'descopeSdk', {
        get() {
          throw new Error('failed to load');
        }
      });

      f.detectChanges();
      await flush();
      f.detectChanges();

      // loadWebComponent swallows the error, so the element still has to render
      // - matching a failed chunk load rather than rendering nothing at all.
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to load Descope web component:',
        expect.any(Error)
      );
      expect(f.nativeElement.querySelector('descope-wc')).toBeTruthy();
      expect(connects[0].projectId).toBe('P_TEST');

      consoleError.mockRestore();
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
