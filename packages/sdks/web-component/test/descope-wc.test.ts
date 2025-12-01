/* eslint-disable max-classes-per-file */
// @ts-nocheck
import { createSdk, ensureFingerprintIds } from '@descope/web-js-sdk';
import { fireEvent, waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { screen } from 'shadow-dom-testing-library';
import {
  ASSETS_FOLDER,
  CONFIG_FILENAME,
  CUSTOM_INTERACTIONS,
  DESCOPE_ATTRIBUTE_PREFIX,
  DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
  ELEMENT_TYPE_ATTRIBUTE,
  RESPONSE_ACTIONS,
  URL_CODE_PARAM_NAME,
  URL_ERR_PARAM_NAME,
  URL_RUN_IDS_PARAM_NAME,
  URL_TOKEN_PARAM_NAME,
  URL_REDIRECT_AUTH_CALLBACK_PARAM_NAME,
  URL_REDIRECT_AUTH_BACKUP_CALLBACK_PARAM_NAME,
  URL_REDIRECT_AUTH_CHALLENGE_PARAM_NAME,
  URL_REDIRECT_AUTH_INITIATOR_PARAM_NAME,
  OIDC_IDP_STATE_ID_PARAM_NAME,
  SAML_IDP_STATE_ID_PARAM_NAME,
  SAML_IDP_USERNAME_PARAM_NAME,
  SSO_APP_ID_PARAM_NAME,
  HAS_DYNAMIC_VALUES_ATTR_NAME,
  OIDC_LOGIN_HINT_PARAM_NAME,
  DESCOPE_IDP_INITIATED_PARAM_NAME,
  OIDC_PROMPT_PARAM_NAME,
  SDK_SCRIPT_RESULTS_KEY,
  OIDC_ERROR_REDIRECT_URI_PARAM_NAME,
  OIDC_RESOURCE_PARAM_NAME,
  THIRD_PARTY_APP_STATE_ID_PARAM_NAME,
  APPLICATION_SCOPES_PARAM_NAME,
  SDK_SCRIPTS_LOAD_TIMEOUT,
  FLOW_TIMED_OUT_ERROR_CODE,
} from '../src/lib/constants';
import DescopeWc from '../src/lib/descope-wc';
// eslint-disable-next-line import/no-namespace
import * as helpers from '../src/lib/helpers/helpers';
// eslint-disable-next-line import/no-namespace
import { generateSdkResponse, invokeScriptOnload } from './testUtils';
import { getABTestingKey } from '../src/lib/helpers/abTestingKey';
import { resetCustomStorage } from '../src/lib/helpers/storage';
import BaseDescopeWc from '../src/lib/descope-wc/BaseDescopeWc';

global.CSSStyleSheet.prototype.replaceSync = jest.fn();

jest.mock('@descope/web-js-sdk', () => ({
  __esModule: true,
  createSdk: jest.fn(),
  clearFingerprintData: jest.fn(),
  ensureFingerprintIds: jest.fn(),
}));

const WAIT_TIMEOUT = 25000;
const THEME_DEFAULT_FILENAME = `theme.json`;

const abTestingKey = getABTestingKey();

const defaultOptionsValues = {
  baseUrl: '',
  deferredRedirect: false,
  abTestingKey,
  lastAuth: {},
  oidcIdpStateId: null,
  oidcLoginHint: null,
  oidcPrompt: null,
  samlIdpStateId: null,
  samlIdpUsername: null,
  oidcErrorRedirectUri: null,
  oidcResource: null,
  descopeIdpInitiated: false,
  ssoAppId: null,
  client: {},
  redirectAuth: undefined,
  tenant: undefined,
  locale: 'en-us',
  nativeOptions: undefined,
  thirdPartyAppId: null,
  thirdPartyAppStateId: null,
  applicationScopes: null,
  outboundAppId: null,
  outboundAppScopes: null,
};

class MockFileReader {
  onload = null;

  readAsDataURL() {
    if (this.onload) {
      this.onload({
        target: {
          result: 'data:;base64,example',
        },
      });
    }
  }
}

const sdk = {
  flow: {
    start: jest.fn().mockName('flow.start'),
    next: jest.fn().mockName('flow.next'),
  },
  webauthn: {
    helpers: {
      isSupported: jest.fn(),
      conditional: jest.fn(() => Promise.resolve()),
      create: jest.fn(),
      get: jest.fn(),
    },
  },
  getLastUserLoginId: jest.fn().mockName('getLastUserLoginId'),
  getLastUserDisplayName: jest.fn().mockName('getLastUserDisplayName'),
};

const nextMock = sdk.flow.next as jest.Mock;
const startMock = sdk.flow.start as jest.Mock;
const isWebauthnSupportedMock = sdk.webauthn.helpers.isSupported as jest.Mock;
const getLastUserLoginIdMock = sdk.getLastUserLoginId as jest.Mock;
const getLastUserDisplayNameMock = sdk.getLastUserDisplayName as jest.Mock;
const scriptMock = Object.assign(document.createElement('script'), {
  setAttribute: jest.fn(),
  addEventListener: jest.fn(),
  onload: jest.fn(),
  onerror: jest.fn(),
});

// this is for mocking the pages/theme/config
let themeContent = {};
let pageContent = '';
let configContent: any = {};

class TestClass {}

const fetchMock: jest.Mock = jest.fn();
global.fetch = fetchMock;

Object.defineProperty(window, 'location', {
  value: new URL(window.location.origin),
});
window.location.assign = jest.fn();
window.open = jest.fn();

Object.defineProperty(window, 'PublicKeyCredential', { value: TestClass });

Object.defineProperty(window.history, 'pushState', {
  value: (x: any, y: any, url: string) => {
    window.location.href = url;
  },
});
Object.defineProperty(window.history, 'replaceState', {
  value: (x: any, y: any, url: string) => {
    window.location.href = url;
  },
});

class DescopeButton extends HTMLElement {
  constructor() {
    super();
    const template = document.createElement('template');
    template.innerHTML = `<button><slot></slot></button>`;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }
}

customElements.define('descope-button', DescopeButton);
const origAppend = document.body.append;
const orginalCreateElement = document.createElement;

const mockStartScript = jest.fn();
const mockStopScript = jest.fn();
const mockRefreshScript = jest.fn();
const mockPresentScript = jest.fn();
const mockClientScript = jest.fn(() => ({
  id: 'grecaptcha',
  start: mockStartScript,
  stop: mockStopScript,
  refresh: mockRefreshScript,
  present: mockPresentScript,
}));

describe('web-component', () => {
  beforeEach(() => {
    configContent = {
      flows: {
        'versioned-flow': { version: 1 },
        otpSignInEmail: { version: 1 },
      },
      componentsVersion: '1.2.3',
    };
    jest.useFakeTimers();

    // Mock Math.random for consistent abTestingKey
    jest.spyOn(Math, 'random').mockReturnValue(0.215);

    // Update defaultOptionsValues with mocked abTestingKey
    defaultOptionsValues.abTestingKey = getABTestingKey();

    globalThis.DescopeUI = {};

    fetchMock.mockImplementation((url: string) => {
      const res = {
        ok: true,
        headers: new Headers({ 'x-geo': 'XX' }),
      };

      switch (true) {
        case url.endsWith('theme.json'): {
          return { ...res, json: () => themeContent };
        }
        case url.endsWith('.html'): {
          return { ...res, text: () => pageContent };
        }
        case url.endsWith('config.json'): {
          return { ...res, json: () => configContent };
        }
        default: {
          return { ok: false };
        }
      }
    });
    (createSdk as jest.Mock).mockReturnValue(sdk);

    invokeScriptOnload();

    jest.spyOn(document, 'createElement').mockImplementation((element) => {
      if (element.toLowerCase() === 'script') {
        return scriptMock;
      }
      return orginalCreateElement.apply(document, [element]);
    });
  });

  afterEach(() => {
    // document.getElementsByTagName('html')[0].innerHTML = '';

    document.getElementsByTagName('head')[0].innerHTML = '';
    document.getElementsByTagName('body')[0].innerHTML = '';
    document.body.append = origAppend;
    // We need a full reset to isolate tests, BUT one mock (mockClientScript) must keep a stable implementation.
    // So we reset everything and then immediately restore the implementation for mockClientScript.
    jest.resetAllMocks();
    mockClientScript.mockImplementation(() => ({
      id: 'grecaptcha',
      start: mockStartScript,
      stop: mockStopScript,
      refresh: mockRefreshScript,
      present: mockPresentScript,
    }));
    window.location.search = '';
    themeContent = {};
    pageContent = '';
    localStorage.removeItem('dls_ab_testing_id');
    localStorage.removeItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY);
    resetCustomStorage();
  });

  describe('customStorage', () => {
    const mockCustomStorage = {
      getItem: jest.fn((key: string) => `mocked_${key}`),
      setItem: jest.fn(() => {}),
      removeItem: jest.fn(() => {}),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      startMock.mockReturnValue(generateSdkResponse({}));
      pageContent = '<button id="email">Button</button><span>It works!</span>';

      const DescopeUI = {
        componentsThemeManager: { currentThemeName: undefined },
      };
      globalThis.DescopeUI = DescopeUI;
    });

    it('should accept customStorage property and pass it to SDK config', async () => {
      // Create element and set customStorage before adding to DOM
      const wc = document.createElement('descope-wc') as any;
      wc.setAttribute('flow-id', 'otpSignInEmail');
      wc.setAttribute('project-id', '1');
      wc.customStorage = mockCustomStorage;

      document.body.innerHTML = `<h1>Custom element test</h1>`;
      document.body.appendChild(wc);

      await waitFor(() => screen.getByShadowText('Button'), {
        timeout: WAIT_TIMEOUT,
      });

      // Wait for the SDK to be created with the custom storage
      await waitFor(
        () => {
          expect(createSdk).toHaveBeenCalledWith(
            expect.objectContaining({
              customStorage: mockCustomStorage,
            }),
          );
        },
        { timeout: 2000 },
      );
    });

    it('should handle customStorage with async methods', async () => {
      const asyncCustomStorage = {
        getItem: jest.fn(async (key: string) =>
          Promise.resolve(`async_${key}`),
        ),
        setItem: jest.fn(async () => Promise.resolve()),
        removeItem: jest.fn(async () => Promise.resolve()),
      };

      // Create element and set customStorage before adding to DOM
      const wc = document.createElement('descope-wc') as any;
      wc.setAttribute('flow-id', 'otpSignInEmail');
      wc.setAttribute('project-id', '1');
      wc.customStorage = asyncCustomStorage;

      document.body.innerHTML = `<h1>Custom element test</h1>`;
      document.body.appendChild(wc);

      await waitFor(
        () => {
          expect(createSdk).toHaveBeenCalledWith(
            expect.objectContaining({
              customStorage: asyncCustomStorage,
            }),
          );
        },
        { timeout: 2000 },
      );
    });

    it('should validate customStorage interface', async () => {
      const invalidStorage = {
        getItem: jest.fn(),
        // Missing set and remove methods
      };

      // Create element and set customStorage before adding to DOM
      const wc = document.createElement('descope-wc') as any;
      wc.setAttribute('flow-id', 'otpSignInEmail');
      wc.setAttribute('project-id', '1');

      document.body.innerHTML = `<h1>Custom element test</h1>`;
      document.body.appendChild(wc);

      // Should throw when setting invalid storage
      expect(() => {
        wc.customStorage = invalidStorage;
      }).toThrow('Custom storage must have a setItem method');
    });
  });

  describe('popup postMessage / BroadcastChannel logic', () => {
    let originalBroadcastChannel;
    let broadcastInstances;
    let originalWindowName;
    let originalOpener;

    beforeEach(() => {
      originalBroadcastChannel = global.BroadcastChannel;
      broadcastInstances = [];
      class MockBroadcastChannel {
        constructor(name) {
          this.name = name;
          this.messages = [];
          this.closed = false;
          this.onMessageInternal = null;
          broadcastInstances.push(this);
        }

        postMessage(msg) {
          this.messages.push(msg);
        }

        close() {
          this.closed = true;
        }

        set onmessage(fn) {
          this.onMessageInternal = fn;
        }

        get onmessage() {
          return this.onMessageInternal;
        }

        emit(event) {
          if (this.onMessageInternal) this.onMessageInternal(event);
        }
      }
      // @ts-ignore
      global.BroadcastChannel = jest.fn(
        (name) => new MockBroadcastChannel(name),
      );

      originalWindowName = window.name;
      originalOpener = window.opener;
      window.opener = { postMessage: jest.fn() } as any;
      window.close = jest.fn();

      startMock.mockReturnValue(generateSdkResponse({}));
    });

    afterEach(() => {
      global.BroadcastChannel = originalBroadcastChannel;
      window.name = originalWindowName;
      window.opener = originalOpener;
    });

    it('shouldUsePopupPostMessage returns false when popup-origin not set', async () => {
      pageContent = '<div>Loaded popup test</div>';
      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;
      const wc: any = document.querySelector('descope-wc');
      await waitFor(() => screen.getByShadowText('Loaded popup test'), {
        timeout: WAIT_TIMEOUT,
      });
      expect(wc.shouldUsePopupPostMessage()).toBe(false);
    });

    it('shouldUsePopupPostMessage returns true when popup-origin value has the same window origin', async () => {
      pageContent = '<div>Loaded popup test</div>';
      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" popup-origin="${window.location.origin}"></descope-wc>`;
      const wc: any = document.querySelector('descope-wc');
      await waitFor(() => screen.getByShadowText('Loaded popup test'), {
        timeout: WAIT_TIMEOUT,
      });
      expect(wc.shouldUsePopupPostMessage()).toBe(true);
    });

    it('shouldUsePopupPostMessage returns false for invalid origin attribute', async () => {
      pageContent = '<div>Loaded popup test</div>';
      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" popup-origin="not-a-valid-url"></descope-wc>`;
      const wc: any = document.querySelector('descope-wc');
      await waitFor(() => screen.getByShadowText('Loaded popup test'), {
        timeout: WAIT_TIMEOUT,
      });
      expect(wc.shouldUsePopupPostMessage()).toBe(false);
    });

    it('shouldUsePopupPostMessage returns true for valid different origin', async () => {
      pageContent = '<div>Loaded popup test</div>';
      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" popup-origin="https://example.com"></descope-wc>`;
      const wc: any = document.querySelector('descope-wc');
      await waitFor(() => screen.getByShadowText('Loaded popup test'), {
        timeout: WAIT_TIMEOUT,
      });
      expect(wc.shouldUsePopupPostMessage()).toBe(true);
    });

    it('notifyOpener uses BroadcastChannel when window.name not set', async () => {
      pageContent = '<div>Loaded popup test</div>';
      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;
      const wc: any = document.querySelector('descope-wc');
      await waitFor(() => screen.getByShadowText('Loaded popup test'), {
        timeout: WAIT_TIMEOUT,
      });

      // Simulate popup flow state changes
      wc.flowState.update({
        executionId: 'exec-1',
        isPopup: true,
        code: undefined,
        exchangeError: undefined,
      });
      wc.flowState.update({
        executionId: 'exec-1',
        isPopup: true,
        code: 'abc123',
        exchangeError: undefined,
      });
      await waitFor(
        () => expect(global.BroadcastChannel).toHaveBeenCalledWith('exec-1'),
        { timeout: 2000 },
      );
      const instance = broadcastInstances.find((b) => b.name === 'exec-1');
      expect(instance).toBeTruthy();
      expect(instance.messages).toContainEqual({
        action: 'code',
        data: { code: 'abc123', exchangeError: undefined },
      });
      expect(instance.closed).toBe(true);
    });

    it('notifyOpener uses postMessage fallback with window.name prefix', async () => {
      pageContent = '<div>Loaded popup test</div>';
      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;
      const wc: any = document.querySelector('descope-wc');
      await waitFor(() => screen.getByShadowText('Loaded popup test'), {
        timeout: WAIT_TIMEOUT,
      });

      // Set window.name pattern to trigger postMessage fallback
      const crossOrigin = 'https://cross-origin.example';
      window.name = `descope-wc|${crossOrigin}`;

      wc.flowState.update({
        executionId: 'exec-2',
        isPopup: true,
        code: undefined,
        exchangeError: 'errX',
      });
      wc.flowState.update({
        executionId: 'exec-2',
        isPopup: true,
        code: 'codeXYZ',
        exchangeError: 'errX',
      });
      await waitFor(
        () => expect(window.opener.postMessage).toHaveBeenCalled(),
        { timeout: 2000 },
      );
      expect(window.opener.postMessage).toHaveBeenCalledWith(
        { action: 'code', data: { code: 'codeXYZ', exchangeError: 'errX' } },
        crossOrigin,
      );
      expect(global.BroadcastChannel).not.toHaveBeenCalledWith('exec-2');
    });

    it('notifyOpener handles postMessage errors gracefully', async () => {
      pageContent = '<div>Loaded popup test</div>';
      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;
      const wc: any = document.querySelector('descope-wc');
      await waitFor(() => screen.getByShadowText('Loaded popup test'), {
        timeout: WAIT_TIMEOUT,
      });

      const crossOrigin = 'https://other.example';
      window.name = `descope-wc|${crossOrigin}`;
      (window.opener.postMessage as jest.Mock).mockImplementation(() => {
        throw new Error('COOP blocked');
      });

      wc.flowState.update({
        executionId: 'exec-3',
        isPopup: true,
        code: 'x',
        exchangeError: 'y',
      });
      await waitFor(
        () => expect(window.opener.postMessage).toHaveBeenCalled(),
        { timeout: 2000 },
      );
      expect(global.BroadcastChannel).not.toHaveBeenCalledWith('exec-3');
    });

    // Removed deprecated commented redirect tests; active versions added later with cleanup coverage

    it('should detect popup close and dispatch event', async () => {
      startMock.mockReturnValue({
        ok: true,
        data: {
          stepId: 's3',
          stepName: 'Step 3',
          action: RESPONSE_ACTIONS.redirect,
          screen: { id: '0', state: {} },
          redirect: { url: 'https://auth.example', isPopup: true },
          executionId: 'exec-redirect-close',
          status: 'running',
          authInfo: 'auth info',
          webauthn: { options: '', transactionId: '' },
          samlIdpResponse: { url: '', samlResponse: '', relayState: '' },
          lastAuth: {},
          nativeResponse: { type: '', payload: {} },
        },
        error: {},
      });
      const popupObj: any = {
        closed: false,
        name: '',
        location: { href: '' },
        focus: jest.fn(),
      };
      jest.spyOn(helpers, 'openCenteredPopup').mockReturnValue(popupObj);
      pageContent = '';
      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;
      const wc: any = document.querySelector('descope-wc');
      const onClosed = jest.fn();
      wc.addEventListener('popupclosed', onClosed);
      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: 2000,
      });
      // Advance time to trigger interval check
      popupObj.closed = true;
      jest.advanceTimersByTime(1100);
      await waitFor(() => expect(onClosed).toHaveBeenCalled(), {
        timeout: 2000,
      });
    });
  });

  describe('SAML', () => {
    it('should validate handling of saml idp response', async () => {
      const samlUrl = 'http://acs.dummy.com';

      startMock.mockReturnValue(
        generateSdkResponse({
          ok: true,
          executionId: 'e1',
          action: RESPONSE_ACTIONS.loadForm,
          samlIdpResponseUrl: samlUrl,
          samlIdpResponseSamlResponse: 'saml-response-dummy-value',
          samlIdpResponseRelayState: 'saml-relay-state-dummy-value',
        }),
      );

      const mockSubmitForm = jest.spyOn(helpers, 'submitForm');
      mockSubmitForm.mockImplementation(() => {});

      document.body.innerHTML = `<h1>Custom element test</h1><descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

      const form = (await waitFor(
        () => {
          const samlForm = document.querySelector(`form[action="${samlUrl}"]`);

          if (!samlForm) {
            throw Error();
          }
          return samlForm;
        },
        {
          timeout: 8000,
        },
      )) as HTMLFormElement;

      expect(form).toBeInTheDocument();

      // validate inputs exist
      const inputSamlResponse = document.querySelector(
        `form[action="${samlUrl}"] input[role="saml-response"]`,
      );
      expect(inputSamlResponse).toBeInTheDocument();
      expect(inputSamlResponse).not.toBeVisible();
      expect(inputSamlResponse).toHaveValue('saml-response-dummy-value');

      // validate inputs are hidden
      const inputSamlRelayState = document.querySelector(
        `form[action="${samlUrl}"] input[role="saml-relay-state"]`,
      );
      expect(inputSamlRelayState).toBeInTheDocument();
      expect(inputSamlRelayState).not.toBeVisible();
      expect(inputSamlRelayState).toHaveValue('saml-relay-state-dummy-value');

      await waitFor(
        () => {
          expect(mockSubmitForm).toHaveBeenCalledTimes(1);
        },
        { timeout: 6000 },
      );
    });

    it('should automatic fill saml idp username in form element', async () => {
      startMock.mockReturnValue(
        generateSdkResponse({
          ok: true,
          executionId: 'e1',
        }),
      );
      nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

      const samlIdpEmailAddress = 'dummy@email.com';
      const encodedSamlIdpEmailAddress =
        encodeURIComponent(samlIdpEmailAddress);
      window.location.search = `?${SAML_IDP_USERNAME_PARAM_NAME}=${encodedSamlIdpEmailAddress}`;

      pageContent = `<div>Loaded</div><input class="descope-input" id="loginId" name="loginId" value="{{loginId}}">{{loginId}}</input><input class="descope-input" id="email" name="email">{{email}}</input>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      const inputs = await waitFor(
        () => screen.findAllByShadowDisplayValue(samlIdpEmailAddress),
        {
          timeout: 6000,
        },
      );

      expect(inputs.length).toBe(2);
    });
  });

  it('When has polling element, and next poll returns error response', async () => {
    jest.useRealTimers();

    startMock.mockReturnValueOnce(generateSdkResponse());

    nextMock
      .mockReturnValueOnce(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.poll,
        }),
      )
      .mockReturnValue(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.poll,
          ok: false,
          requestErrorCode: FLOW_TIMED_OUT_ERROR_CODE,
        }),
      );

    pageContent = '<div data-type="polling">...</div><span>It works!</span>';
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    const onError = jest.fn();

    const wcEle = document.getElementsByTagName('descope-wc')[0];

    wcEle.addEventListener('error', onError);

    await waitFor(() => expect(onError).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });

    nextMock.mockClear();

    await new Promise((resolve) => {
      setTimeout(resolve, 4000);
    });

    expect(nextMock).toHaveBeenCalledTimes(1);

    wcEle.removeEventListener('error', onError);
  }, 20000);

  it('When has polling element, stop on unmounted element', async () => {
    jest.useRealTimers();

    startMock.mockReturnValueOnce(generateSdkResponse());

    nextMock.mockReturnValue(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.poll,
      }),
    );

    pageContent = '<div data-type="polling">...</div><span>It works!</span>';
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    const wcEle = document.getElementsByTagName('descope-wc')[0];

    await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
      timeout: 20000,
    });
    nextMock.mockClear();
    document.body.removeChild(wcEle);

    // wait some time to ensure polling has stopped
    await new Promise((resolve) => {
      setTimeout(resolve, 4000);
    });

    expect(nextMock).not.toHaveBeenCalled();
  }, 30000);

  it('should set loading attribute on submitter and disable other enabled elements', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    pageContent = `
      <span>Test Page</span>
      <descope-button id="submit">Submit</descope-button>
      <descope-button id="another">Another Button</descope-button>
      <input id="input" placeholder="Input"/>
      `;
    document.body.innerHTML = `<descope-wc flow-id="test-flow" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Test Page'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('Submit'));

    await waitFor(
      () => {
        expect(screen.getByShadowText('Submit')).toHaveAttribute(
          'loading',
          'true',
        );
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(screen.getByShadowText('Another Button')).toHaveAttribute(
          'disabled',
          'true',
        );
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(screen.getByShadowPlaceholderText('Input')).toHaveAttribute(
          'disabled',
          'true',
        );
      },
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should restore loading and disable state on pageshow', async () => {
    jest.useRealTimers();

    startMock.mockReturnValue(generateSdkResponse());

    pageContent = `
      <span>Test Page</span>
      <descope-button id="submit">Submit</descope-button>
      <descope-button id="another">Another Button</descope-button>
      <input id="input" placeholder="Input"/>
      `;
    document.body.innerHTML = `<descope-wc flow-id="test-flow" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Test Page'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('Submit'));

    await waitFor(
      () => {
        expect(screen.getByShadowText('Submit')).toHaveAttribute(
          'loading',
          'true',
        );
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(screen.getByShadowText('Another Button')).toHaveAttribute(
          'disabled',
          'true',
        );
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(screen.getByShadowPlaceholderText('Input')).toHaveAttribute(
          'disabled',
          'true',
        );
      },
      { timeout: WAIT_TIMEOUT },
    );

    fireEvent.pageShow(window, { persisted: true });

    await waitFor(
      () => {
        expect(screen.getByShadowText('Submit')).not.toHaveAttribute('loading');
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(screen.getByShadowText('Another Button')).toBeEnabled();
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(screen.getByShadowPlaceholderText('Input')).toBeEnabled();
      },
      { timeout: WAIT_TIMEOUT },
    );
  }, 10000);

  it('should restore states when staying on the same screen', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    nextMock.mockReturnValue(generateSdkResponse());

    pageContent = `
      <span>Test Page</span>
      <descope-button id="submit">Submit</descope-button>
      <descope-button id="another">Another Button</descope-button>
      <input id="input" placeholder="Input"/>
      `;
    document.body.innerHTML = `<descope-wc flow-id="test-flow" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Test Page'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('Submit'));

    const submitButton = screen.getByShadowText('Submit');
    const anotherButton = screen.getByShadowText('Another Button');
    const inputField = screen.getByShadowPlaceholderText('Input');

    // wait for the loading state to be set
    await waitFor(
      () => {
        expect(submitButton).toHaveAttribute('loading', 'true');
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(anotherButton).toHaveAttribute('disabled', 'true');
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(inputField).toHaveAttribute('disabled', 'true');
      },
      { timeout: WAIT_TIMEOUT },
    );

    // wait for loading state to be removed
    await waitFor(
      () => {
        expect(submitButton).not.toHaveAttribute('loading');
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(anotherButton).toBeEnabled();
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(inputField).toBeEnabled();
      },
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should NOT restore states when navigating to a different screen', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    nextMock.mockReturnValue(generateSdkResponse({ screenId: '1' }));

    pageContent = `
      <span>Test Page</span>
      <descope-button id="submit">Submit</descope-button>
      <descope-button id="another">Another Button</descope-button>
      <input id="input" placeholder="Input"/>
      `;
    document.body.innerHTML = `<descope-wc flow-id="test-flow" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Test Page'), {
      timeout: WAIT_TIMEOUT,
    });

    const submitButton = screen.getByShadowText('Submit');
    const anotherButton = screen.getByShadowText('Another Button');
    const inputField = screen.getByShadowPlaceholderText('Input');

    pageContent = `
      <span>Test Page 2</span>
      <descope-button id="submit">Submit</descope-button>
      <descope-button id="another">Another Button</descope-button>
      <input id="input" placeholder="Input"/>
      `;

    fireEvent.click(submitButton);

    // wait for the loading state to be set
    await waitFor(
      () => {
        expect(submitButton).toHaveAttribute('loading', 'true');
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(anotherButton).toHaveAttribute('disabled', 'true');
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(inputField).toHaveAttribute('disabled', 'true');
      },
      { timeout: WAIT_TIMEOUT },
    );

    // wait for the next screen to be rendered
    await waitFor(() => screen.getByShadowText('Test Page 2'), {
      timeout: WAIT_TIMEOUT,
    });

    // check that the loading state is not restored
    await waitFor(
      () => {
        expect(submitButton).toHaveAttribute('loading', 'true');
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(anotherButton).toHaveAttribute('disabled', 'true');
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(inputField).toHaveAttribute('disabled', 'true');
      },
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should switch theme on the fly', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    pageContent = '<button id="email">Button</button><span>It works!</span>';

    const DescopeUI = {
      componentsThemeManager: { currentThemeName: undefined },
    };
    globalThis.DescopeUI = DescopeUI;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc theme="light" flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Button'), {
      timeout: WAIT_TIMEOUT,
    });

    const wc = document.querySelector('descope-wc');
    wc.setAttribute('theme', 'dark');

    const rootEle = wc.shadowRoot.querySelector('#root');

    await waitFor(
      () =>
        expect(DescopeUI.componentsThemeManager.currentThemeName).toBe('dark'),
      { timeout: 3000 },
    );
    await waitFor(() => expect(rootEle).toHaveAttribute('data-theme', 'dark'), {
      timeout: 3000,
    });
  }, 5000);

  it('should clear the flow query params after render', async () => {
    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_1&code=123456`;
    nextMock.mockReturnValue(generateSdkResponse({}));

    pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(() => expect(window.location.search).toBe(''));
  });

  it('should call the error cb when API call returns error', async () => {
    pageContent = '<input id="email" name="email"></input>';

    startMock.mockReturnValue(
      generateSdkResponse({
        ok: false,
        requestErrorMessage: 'Not found',
        requestErrorDescription: 'Not found',
        requestErrorCode: '123',
      }),
    );

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    const wcEle = document.getElementsByTagName('descope-wc')[0];

    const onError = jest.fn();
    wcEle.addEventListener('error', onError);

    await waitFor(
      () =>
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: {
              errorMessage: 'Not found',
              errorDescription: 'Not found',
              errorCode: '123',
            },
          }),
        ),
      { timeout: WAIT_TIMEOUT },
    );

    wcEle.removeEventListener('error', onError);
  });

  it('When WC loads it injects the correct content', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });
  });

  it('When getting E102004 error, and the components version remains the same, should restart the flow with the correct version', async () => {
    startMock.mockReturnValueOnce(
      generateSdkResponse({ requestErrorCode: 'E102004', ok: false }),
    );
    startMock.mockReturnValue(generateSdkResponse({}));

    pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1" restart-on-error="true"></descope-wc>`;

    const flattenConfigFlowVersions = (flows) =>
      Object.entries(flows).reduce(
        (acc, [key, val]) => ({ ...acc, [key]: val.version }),
        {},
      );

    await waitFor(() => expect(startMock).toBeCalledTimes(1), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(
      () =>
        expect(startMock).toHaveBeenCalledWith(
          'otpSignInEmail',
          expect.any(Object),
          undefined,
          '',
          '1.2.3',
          flattenConfigFlowVersions(configContent.flows),
          {},
        ),
      { timeout: WAIT_TIMEOUT },
    );

    configContent.flows.otpSignInEmail.version = 2;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(() => expect(startMock).toBeCalledTimes(2), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(
      () =>
        expect(startMock).toHaveBeenCalledWith(
          'otpSignInEmail',
          expect.any(Object),
          undefined,
          '',
          '1.2.3',
          flattenConfigFlowVersions(configContent.flows),
          {},
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('When WC loads it injects the theme', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    pageContent = '<input id="email"></input><span>It works!</span>';
    themeContent = {
      light: { globals: 'button { color: red; }' },
      dark: { globals: 'button { color: blue; }' },
    };

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1" theme="light"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(
      () =>
        expect(global.CSSStyleSheet.prototype.replaceSync).toHaveBeenCalledWith(
          (themeContent as any).light.globals +
            (themeContent as any).dark.globals,
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('Auto focus input by default', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    const autoFocusSpy = jest.spyOn(helpers, 'handleAutoFocus');
    pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(() =>
      expect(autoFocusSpy).toBeCalledWith(expect.any(HTMLElement), true, true),
    );
  });

  it('Auto focus should not happen when auto-focus is false', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    const autoFocusSpy = jest.spyOn(helpers, 'handleAutoFocus');
    pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc auto-focus="false" flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(() =>
      expect(autoFocusSpy).toBeCalledWith(expect.any(HTMLElement), false, true),
    );
  });

  it('Auto focus should not happen when auto-focus is `skipFirstScreen`', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));
    const autoFocusSpy = jest.spyOn(helpers, 'handleAutoFocus');
    pageContent =
      '<input id="email"></input><descope-button>click</descope-button><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc auto-focus="skipFirstScreen" flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(() =>
      expect(autoFocusSpy).toBeCalledWith(
        expect.any(HTMLElement),
        'skipFirstScreen',
        true,
      ),
    );
    autoFocusSpy.mockClear();

    fireEvent.click(screen.getByShadowText('click'));
    await waitFor(
      () => {
        expect(autoFocusSpy).toBeCalledWith(
          expect.any(HTMLElement),
          'skipFirstScreen',
          false,
        );
      },
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should fetch the data from the correct path', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0.html`;
    const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/${THEME_DEFAULT_FILENAME}`;
    const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

    const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
    const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
    const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(htmlUrlPathRegex),
      expect.any(Object),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(themeUrlPathRegex),
      expect.any(Object),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(configUrlPathRegex),
      expect.any(Object),
    );
  });

  it('should fetch the data from the correct path with custom style name', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail" style-id="test"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0.html`;
    const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/test.json`;
    const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

    const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
    const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
    const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(htmlUrlPathRegex),
      expect.any(Object),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(themeUrlPathRegex),
      expect.any(Object),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(configUrlPathRegex),
      expect.any(Object),
    );
  });

  it('should fetch the data from the correct base static url', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail" base-static-url="http://base.url/pages"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/^http:\/\/base.url\/pages.*\.html/),
      expect.any(Object),
    );
  });

  it('should throw an error project-id is missing', async () => {
    class Test extends DescopeWc {
      constructor() {
        super();
        Object.defineProperty(this, 'shadowRoot', {
          value: { isConnected: true, appendChild: () => {} },
        });
      }

      // eslint-disable-next-line class-methods-use-this
      public get flowId() {
        return '1';
      }
    }

    customElements.define('test-project', Test as any);
    const descope: any = new Test();
    Object.defineProperty(descope.shadowRoot, 'host', {
      value: { closest: jest.fn() },
      writable: true,
    });

    await expect(descope.init.bind(descope)).rejects.toThrow(
      'project-id cannot be empty',
    );
  });

  it('should throw an error when flow-id is missing', async () => {
    class Test extends DescopeWc {
      constructor() {
        super();
        Object.defineProperty(this, 'shadowRoot', {
          value: { isConnected: true, appendChild: () => {} },
        });
      }

      // eslint-disable-next-line class-methods-use-this
      public get projectId() {
        return '1';
      }
    }
    customElements.define('test-flow', Test as any);
    const descope: any = new Test();
    Object.defineProperty(descope.shadowRoot, 'host', {
      value: { closest: jest.fn() },
      writable: true,
    });

    await expect(descope.init.bind(descope)).rejects.toThrow(
      'flow-id cannot be empty',
    );
  });

  it('should update the page when props are changed', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    startMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    pageContent = '<input id="email"></input><span>It updated!</span>';

    const wcEle = document.getElementsByTagName('descope-wc')[0];

    wcEle.setAttribute('project-id', '2');

    await waitFor(() => screen.findByShadowText('It updated!'), {
      timeout: WAIT_TIMEOUT,
    });
  });

  it('When submitting it injects the next page to the website', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    pageContent =
      '<descope-button>click</descope-button><input id="email"></input><input id="code"></input><span>Loaded</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded'), {
      timeout: WAIT_TIMEOUT,
    });

    pageContent =
      '<input id="email"></input><input id="code"></input><span>It works!</span>';

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    expect(startMock).toBeCalledTimes(1);
    expect(nextMock).toBeCalledTimes(1);
  });

  it('When submitting it calls next with the button id', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    pageContent =
      '<descope-button id="submitterId">click</descope-button><input id="email" name="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(() =>
      expect(nextMock).toHaveBeenCalledWith(
        '0',
        '0',
        'submitterId',
        1,
        '1.2.3',
        {
          email: '',
          origin: 'http://localhost',
        },
        false,
      ),
    );
  });

  it('When submitting it calls next with the input value', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    pageContent =
      '<descope-button id="submitterId">click</descope-button><input id="toggle" name="t1" value="123"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-up-or-in" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(
      () =>
        expect(nextMock).toHaveBeenCalledWith(
          '0',
          '0',
          'submitterId',
          0,
          '1.2.3',
          {
            t1: '123',
            origin: 'http://localhost',
          },
          false,
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('When submitting and no execution id - it calls start with the button id and token if exists', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    configContent = {
      ...configContent,
      flows: {
        'sign-in': { startScreenId: 'screen-0' },
      },
    };
    const token = 'token1';
    window.location.search = `?&${URL_TOKEN_PARAM_NAME}=${token}`;
    pageContent =
      '<descope-button id="submitterId">click</descope-button><input id="email" name="email"></input><span>hey</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1" redirect-url="http://custom.url"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('hey'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(() =>
      expect(startMock).toHaveBeenCalledWith(
        'sign-in',
        {
          ...defaultOptionsValues,
          redirectUrl: 'http://custom.url',
          preview: false,
        },
        undefined,
        'submitterId',
        '1.2.3',
        {
          'sign-in': 0,
        },
        {
          email: '',
          origin: 'http://localhost',
          token,
        },
        false,
      ),
    );
  });

  it('When there is a single button and pressing on enter, it clicks the button', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    pageContent =
      '<descope-button id="buttonId">Click</descope-button><input id="email" name="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const rootEle = document
      .getElementsByTagName('descope-wc')[0]
      .shadowRoot.querySelector('#root');

    fireEvent.keyDown(rootEle, { key: 'Enter', code: 13, charCode: 13 });

    await waitFor(() => expect(nextMock).toHaveBeenCalled());
  });

  it('should not load components which are already loaded', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    pageContent =
      '<descope-test-button id="email">Button</descope-test-button><span>It works!</span>';

    customElements.define('descope-test-button', class extends HTMLElement {});

    const DescopeUI = { 'descope-test-button': jest.fn() };
    globalThis.DescopeUI = DescopeUI;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Button'), {
      timeout: 20000,
    });

    expect(DescopeUI['descope-test-button']).not.toHaveBeenCalled();
  });

  it('When there is a single "sso" button and pressing on enter, it clicks the button', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    pageContent =
      '<descope-button id="noClick">No Click</descope-button><descope-button id="click" data-type="sso">Click</descope-button><input id="email" name="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const rootEle = document
      .getElementsByTagName('descope-wc')[0]
      .shadowRoot.querySelector('#root');

    fireEvent.keyDown(rootEle, { key: 'Enter', code: 13, charCode: 13 });

    await waitFor(() =>
      expect(nextMock).toHaveBeenCalledWith(
        '0',
        '0',
        'click',
        1,
        '1.2.3',
        expect.any(Object),
        false,
      ),
    );
  });

  it('When there is a single "generic" button and pressing on enter, it clicks the button', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    pageContent =
      '<descope-button id="noClick">No Click</descope-button><descope-button id="click" data-type="button">Click</descope-button><input id="email" name="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const rootEle = document
      .getElementsByTagName('descope-wc')[0]
      .shadowRoot.querySelector('#root');

    fireEvent.keyDown(rootEle, { key: 'Enter', code: 13, charCode: 13 });

    await waitFor(() =>
      expect(nextMock).toHaveBeenCalledWith(
        '0',
        '0',
        'click',
        1,
        '1.2.3',
        expect.any(Object),
        false,
      ),
    );
  });

  it('When there are multiple "generic" buttons and pressing on enter, it does not click any button', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    pageContent =
      '<descope-button id="1" data-type="button">Click</descope-button><descope-button id="2" data-type="button">Click</descope-button><input id="email" name="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const rootEle = document
      .getElementsByTagName('descope-wc')[0]
      .shadowRoot.querySelector('#root');

    fireEvent.keyDown(rootEle, { key: 'Enter', code: 13, charCode: 13 });

    await waitFor(() => expect(nextMock).not.toHaveBeenCalled());
  });

  it('When there are multiple "sso" buttons and pressing on enter, it does not click any button', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    pageContent =
      '<descope-button id="1" data-type="sso">Click</descope-button><descope-button id="2" data-type="sso">Click</descope-button><input id="email" name="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const rootEle = document
      .getElementsByTagName('descope-wc')[0]
      .shadowRoot.querySelector('#root');

    fireEvent.keyDown(rootEle, { key: 'Enter', code: 13, charCode: 13 });

    await waitFor(() => expect(nextMock).not.toHaveBeenCalled());
  });

  it('When there are multiple "generic" and "sso" buttons and pressing on enter, it does not click any button', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    pageContent =
      '<descope-button id="1" data-type="button">Click</descope-button><descope-button id="1" data-type="button">Click</descope-button><descope-button id="1" data-type="sso">Click</descope-button><descope-button id="2" data-type="sso">Click</descope-button><input id="email" name="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const rootEle = document
      .getElementsByTagName('descope-wc')[0]
      .shadowRoot.querySelector('#root');

    fireEvent.keyDown(rootEle, { key: 'Enter', code: 13, charCode: 13 });

    await waitFor(() => expect(nextMock).not.toHaveBeenCalled());
  });

  it('When there are multiple button and pressing on enter, it does not clicks any button', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    pageContent =
      '<descope-button id="buttonId">Click</descope-button><descope-button id="buttonId1">Click2</descope-button><input id="email" name="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const rootEle = document
      .getElementsByTagName('descope-wc')[0]
      .shadowRoot.querySelector('#root');

    fireEvent.keyDown(rootEle, { key: 'Enter', code: 13, charCode: 13 });

    await waitFor(() => expect(nextMock).not.toHaveBeenCalled());
  });

  it('When there is a passcode with auto-submit enabled, it auto-submits on input event if value is valid', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse());

    globalThis.DescopeUI = {
      'descope-passcode': jest.fn(),
    };

    pageContent =
      '<descope-passcode data-auto-submit="true" data-testid="otp-code"></descope-passcode><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const codeComponent = screen.getByShadowTestId(
      'otp-code',
    ) as HTMLInputElement;
    codeComponent.checkValidity = jest.fn(() => true);

    fireEvent.input(codeComponent);

    expect(startMock).toHaveBeenCalled();
    await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });
  });

  it('should update the page messages when page is remaining the same but the state is updated', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(
      generateSdkResponse({ screenState: { errorText: 'Error!' } }),
    );

    pageContent = `<descope-button>click</descope-button><div>Loaded1</div><span ${ELEMENT_TYPE_ATTRIBUTE}="error-message">xxx</span>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('Loaded1'), {
      timeout: WAIT_TIMEOUT,
    });

    pageContent = `<div>Loaded2</div><span ${ELEMENT_TYPE_ATTRIBUTE}="error-message">xxx</span>`;

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(
      () =>
        screen.getByShadowText('Error!', {
          selector: `[${ELEMENT_TYPE_ATTRIBUTE}="error-message"]`,
        }),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should update page inputs according to screen state', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(
      generateSdkResponse({ screenState: { inputs: { email: 'email1' } } }),
    );

    pageContent = `<descope-button>click</descope-button><div>Loaded</div><input class="descope-input" name="email">`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(() => screen.getByShadowDisplayValue('email1'), {
      timeout: WAIT_TIMEOUT,
    });
  });

  it('should go next with no file', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse());

    // Use the mock FileReader in your tests.
    (global as any).FileReader = MockFileReader;

    pageContent = `<descope-button>click</descope-button><div>Loaded</div><input class="descope-input" name="image" type="file" placeholder="image-ph">`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(
      () =>
        expect(nextMock).toHaveBeenCalledWith(
          '0',
          '0',
          null,
          1,
          '1.2.3',
          {
            image: '',
            origin: 'http://localhost',
          },
          false,
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should update page templates according to screen state', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({ screenState: { user: { name: 'john' } } }),
    );

    pageContent = `<div>Loaded1</div><descope-text class="descope-text">hey {{user.name}}!</descope-text>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded1'), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(() => screen.getByShadowText('hey john!'));
  });

  it('should update page templates according to last auth login ID when there is no login Id', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({ screenState: { user: {} } }),
    );
    getLastUserLoginIdMock.mockReturnValue('');

    pageContent = `<div>Loaded1</div><descope-text class="descope-text">hey {{lastAuth.loginId}}!</descope-text>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded1'), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(() => screen.getByShadowText('hey !'));
  });

  it('should update page templates according to last auth login ID when there is only login Id in lastAuth with no authMethod', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({
        screenState: { user: {} },
        lastAuth: { loginId: 'not john' },
      }),
    );
    getLastUserLoginIdMock.mockReturnValue('');

    pageContent = `<div>Loaded1</div><descope-text class="descope-text">hey {{lastAuth.loginId}}!</descope-text>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded1'), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(() => screen.getByShadowText('hey !'));
  });

  it('should update page templates according to last auth login ID when there is only login Id', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({ screenState: { user: { loginId: 'john' } } }),
    );
    getLastUserLoginIdMock.mockReturnValue('not john');

    pageContent = `<div>Loaded1</div><descope-text class="descope-text">hey {{lastAuth.loginId}}!</descope-text>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded1'), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(() => screen.getByShadowText('hey not john!'));
  });

  it('should update page templates according to last auth name when there is only login Id', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({ screenState: { user: { name: 'john' } } }),
    );
    getLastUserLoginIdMock.mockReturnValue('not john');

    pageContent = `<div>Loaded1</div><descope-text class="descope-text">hey {{lastAuth.name}}!</descope-text>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded1'), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(() => screen.getByShadowText('hey not john!'));
  });

  it('should update page templates according to last auth name when there is login Id and name', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({ screenState: { user: { name: 'john' } } }),
    );
    getLastUserLoginIdMock.mockReturnValue('not john');
    getLastUserDisplayNameMock.mockReturnValue('Niros!');

    pageContent = `<div>Loaded1</div><descope-text class="descope-text">hey {{lastAuth.name}}!</descope-text>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded1'), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(() => screen.getByShadowText('hey Niros!!'), {
      timeout: WAIT_TIMEOUT,
    });
  });

  it('should update totp and notp link href according to screen state', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({
        screenState: {
          totp: { provisionUrl: 'url1' },
          notp: { redirectUrl: 'url2' },
        },
      }),
    );

    pageContent = `<div>Loaded1</div>
      <descope-link data-type="totp-link">Provision URL</descope-link>
      <descope-link data-type="notp-link">Redirect URL</descope-link>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded1'), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(() => screen.getByShadowText('Provision URL'));

    const totpLink = screen.getByShadowText('Provision URL');
    expect(totpLink).toHaveAttribute('href', 'url1');

    const notpLink = screen.getByShadowText('Redirect URL');
    expect(notpLink).toHaveAttribute('href', 'url2');
  });

  it('should disable webauthn buttons when its not supported in the browser', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    isWebauthnSupportedMock.mockReturnValue(false);

    pageContent = `<div>Loaded1</div><descope-button data-type="biometrics">Webauthn</descope-button>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded1'), {
      timeout: WAIT_TIMEOUT,
    });

    const btn = screen.getByShadowText('Webauthn');
    expect(btn).toHaveAttribute('disabled', 'true');
  });

  it('should update root css var according to screen state', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({ screenState: { totp: { image: 'base-64-text' } } }),
    );

    const spyGet = jest.spyOn(customElements, 'get');
    spyGet.mockReturnValueOnce({ cssVarList: { url: '--url' } } as any);

    pageContent = `<div>Loaded1</div>`;

    document.body.innerHTML = `<h1>Custom element test</h1><descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded1'), {
      timeout: WAIT_TIMEOUT,
    });

    const shadowEle = document.getElementsByTagName('descope-wc')[0].shadowRoot;

    const rootEle = shadowEle.querySelector('#content-root');
    await waitFor(
      () =>
        expect(rootEle).toHaveStyle({
          '--url': 'url(data:image/jpg;base64,base-64-text)',
        }),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should update the page when user changes the url query param value', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    pageContent = '<input id="email" name="email"></input>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    const logSpy = jest.spyOn(console, 'warn');

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_1`;

    fireEvent.popState(window);

    await waitFor(
      () =>
        expect(logSpy).toHaveBeenCalledWith('No screen was found to show', ''),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should handle a case where config request returns error response', async () => {
    const fn = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith('config.json')) {
        return { ok: false };
      }
      return fn(url);
    });
    pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    const errorSpy = jest.spyOn(console, 'error');

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(errorSpy).toHaveBeenCalledWith(
          'Cannot get config file',
          'Make sure that your projectId & flowId are correct',
          expect.any(Error),
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should update the page when user clicks on back', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: 20000,
    });

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_1`;

    pageContent = '<input id="email"></input><span>It updated!</span>';

    fireEvent.popState(window);

    const shadowEle = document.getElementsByTagName('descope-wc')[0].shadowRoot;
    const rootEle = shadowEle.querySelector('#content-root');
    const spyAddEventListener = jest.spyOn(rootEle, 'addEventListener');

    spyAddEventListener.mockImplementation(
      (_, cb) => typeof cb === 'function' && cb({} as Event),
    );

    await waitFor(() => screen.findByShadowText('It updated!'), {
      timeout: 20000,
    });
  });

  it('should call next with token when url contains "t" query param', async () => {
    nextMock.mockReturnValueOnce(generateSdkResponse());

    pageContent = '<span>It works!</span>';

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_0&${URL_TOKEN_PARAM_NAME}=token1`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(
      () =>
        expect(nextMock).toHaveBeenCalledWith('0', '0', 'submit', 1, '1.2.3', {
          token: 'token1',
        }),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should call next with token when url contains "code" query param', async () => {
    nextMock.mockReturnValueOnce(generateSdkResponse());

    pageContent = '<span>It works!</span>';

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_0&${URL_CODE_PARAM_NAME}=code1`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="flow-1" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(nextMock).toHaveBeenCalledWith('0', '0', 'submit', 0, '1.2.3', {
          exchangeCode: 'code1',
        }),
      { timeout: WAIT_TIMEOUT },
    );
    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });
  });

  it('should call next with exchangeError when url contains "err" query param', async () => {
    nextMock.mockReturnValueOnce(generateSdkResponse());

    pageContent = '<span>It works!</span>';

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_0&${URL_ERR_PARAM_NAME}=err1`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(nextMock).toHaveBeenCalledWith('0', '0', 'submit', 1, '1.2.3', {
          exchangeError: 'err1',
        }),
      { timeout: WAIT_TIMEOUT },
    );
    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });
  });

  it('When clicking a button it should collect all the descope attributes and call next with it', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    pageContent = `<descope-button type="button" id="123" ${DESCOPE_ATTRIBUTE_PREFIX}attr1='attr1' ${DESCOPE_ATTRIBUTE_PREFIX}attr2='attr2'>Click</descope-button>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('Click'), {
      timeout: WAIT_TIMEOUT,
    });

    pageContent =
      '<input id="email"></input><input id="code"></input><span>It works!</span>';

    fireEvent.click(screen.getByShadowText('Click'));

    await waitFor(() =>
      expect(nextMock).toBeCalledWith(
        '0',
        '0',
        '123',
        1,
        '1.2.3',
        {
          attr1: 'attr1',
          attr2: 'attr2',
          origin: 'http://localhost',
        },
        false,
      ),
    );
  });

  it('Submitter button should have a loading class when next is pending', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    let resolve: Function;
    nextMock.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolve = res;
        }),
    );

    pageContent = `<descope-button type="button" id="123" ${DESCOPE_ATTRIBUTE_PREFIX}attr1='attr1' ${DESCOPE_ATTRIBUTE_PREFIX}attr2='attr2'>Click</descope-button>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('Click'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('Click'));

    await waitFor(() =>
      expect(screen.getByShadowText('Click')).toHaveAttribute(
        'loading',
        'true',
      ),
    );

    resolve(generateSdkResponse({ screenId: '1' }));

    await waitFor(
      () => expect(screen.getByShadowText('Click')).not.toHaveClass('loading'),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('When action type is "redirect" it navigates to the "redirectUrl" that is received from the server', async () => {
    nextMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.redirect,
        redirectUrl: 'https://myurl.com',
      }),
    );

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_0&${URL_CODE_PARAM_NAME}=code1`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    await waitFor(
      () => expect(window.location.assign).toHaveBeenCalledTimes(1),
      {
        timeout: WAIT_TIMEOUT,
      },
    );
  });

  it('When action type is "redirect" and redirectUrl is missing should log an error ', async () => {
    startMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.redirect,
      }),
    );

    const errorSpy = jest.spyOn(console, 'error');

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(errorSpy).toHaveBeenCalledWith(
          'Did not get redirect url',
          '',
          expect.any(Error),
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('When action type is "redirect" and redirect auth initiator is android navigates to the "redirectUrl" only in foreground', async () => {
    nextMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.redirect,
        redirectUrl: 'https://myurl.com',
      }),
    );

    // Start hidden (in background)
    let isHidden = true;
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get() {
        return isHidden;
      },
    });

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_0&${URL_CODE_PARAM_NAME}=code1&${URL_REDIRECT_AUTH_INITIATOR_PARAM_NAME}=android`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    // Make sure no redirect happened
    await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });
    expect(window.location.assign).not.toHaveBeenCalledWith(
      'https://myurl.com',
    );

    // Back to the foreground
    isHidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(
      () =>
        expect(window.location.assign).toHaveBeenCalledWith(
          'https://myurl.com',
        ),
      {
        timeout: WAIT_TIMEOUT,
      },
    );
  });

  it('When action type is "redirect" and redirect auth initiator is not android navigates to the "redirectUrl" even in background', async () => {
    nextMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.redirect,
        redirectUrl: 'https://myurl.com',
      }),
    );

    // Start hidden (in background)
    const isHidden = true;
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get() {
        return isHidden;
      },
    });

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_0&${URL_CODE_PARAM_NAME}=code1`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    // Make sure no redirect happened
    await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(
      () =>
        expect(window.location.assign).toHaveBeenCalledWith(
          'https://myurl.com',
        ),
      {
        timeout: WAIT_TIMEOUT,
      },
    );
  });

  it('When response has "openInNewTabUrl" it opens the URL in a new window', async () => {
    nextMock.mockReturnValueOnce(
      generateSdkResponse({
        openInNewTabUrl: 'https://loremipsumurl.com',
      }),
    );

    pageContent = '<span>It works!</span>';
    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_0&${URL_CODE_PARAM_NAME}=code1`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    // Make sure url is opened in a new tab
    await waitFor(
      () =>
        expect(window.open).toHaveBeenCalledWith(
          'https://loremipsumurl.com',
          '_blank',
        ),
      {
        timeout: WAIT_TIMEOUT,
      },
    );

    // Should also show the screen
    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });
  });

  it('When action type is "webauthnCreate" and webauthnTransactionId is missing should log an error ', async () => {
    startMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.webauthnCreate,
      }),
    );

    const errorSpy = jest.spyOn(console, 'error');

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(errorSpy).toHaveBeenCalledWith(
          'Did not get webauthn transaction id or options',
          '',
          expect.any(Error),
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('Should create new credentials when action type is "webauthnCreate"', async () => {
    startMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.webauthnCreate,
        webAuthnTransactionId: 't1',
        webAuthnOptions: 'options',
      }),
    );
    pageContent = '<span>It works!</span>';

    nextMock.mockReturnValueOnce(generateSdkResponse());

    sdk.webauthn.helpers.create.mockReturnValueOnce(
      Promise.resolve('webauthn-response'),
    );

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="webauthn_signup" project-id="1"></descope-wc>`;

    await waitFor(
      () => expect(sdk.webauthn.helpers.create).toHaveBeenCalled(),
      { timeout: WAIT_TIMEOUT },
    );
    expect(nextMock).toHaveBeenCalledWith('0', '0', 'submit', 0, '1.2.3', {
      transactionId: 't1',
      response: 'webauthn-response',
    });
  });

  it('Should search of existing credentials when action type is "webauthnGet"', async () => {
    startMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.webauthnGet,
        webAuthnTransactionId: 't1',
        webAuthnOptions: 'options',
      }),
    );

    pageContent = '<span>It works!</span>';

    nextMock.mockReturnValueOnce(generateSdkResponse());

    sdk.webauthn.helpers.get.mockReturnValueOnce(
      Promise.resolve('webauthn-response-get'),
    );

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    await waitFor(() => expect(sdk.webauthn.helpers.get).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });
    expect(nextMock).toHaveBeenCalledWith('0', '0', 'submit', 1, '1.2.3', {
      transactionId: 't1',
      response: 'webauthn-response-get',
    });
  });

  it('Should handle canceling webauthn', async () => {
    startMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.webauthnGet,
        webAuthnTransactionId: 't1',
        webAuthnOptions: 'options',
      }),
    );

    pageContent = '<span>It works!</span>';

    nextMock.mockReturnValueOnce(generateSdkResponse());

    sdk.webauthn.helpers.get.mockReturnValueOnce(
      Promise.reject(new DOMException('', 'NotAllowedError')),
    );

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="webauthn_signup" project-id="1"></descope-wc>`;

    await waitFor(() => expect(sdk.webauthn.helpers.get).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });
    expect(nextMock).toHaveBeenCalledWith('0', '0', 'submit', 0, '1.2.3', {
      transactionId: 't1',
      failure: 'NotAllowedError',
    });
  });

  it('it loads the fonts from the config when loading', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    configContent = {
      ...configContent,
      cssTemplate: {
        light: { fonts: { font1: { url: 'font.url' } } },
      },
    };

    pageContent =
      '<descope-button id="submitterId">click</descope-button><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" theme="light" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: 20000,
    });

    await waitFor(
      () =>
        expect(
          document.head.querySelector(`link[href="font.url"]`),
        ).toBeInTheDocument(),
      { timeout: 5000 },
    );
  }, 20000);

  it('loads flow start screen if its in config file', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    configContent = {
      ...configContent,
      flows: {
        'sign-in': { startScreenId: 'screen-0' },
      },
    };

    pageContent = '<div>hey</div>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('hey'), {
      timeout: WAIT_TIMEOUT,
    });
    expect(startMock).not.toBeCalled();
    const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/screen-0.html`;

    const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(htmlUrlPathRegex),
      expect.any(Object),
    );
  });

  it('should fetch config file once', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    pageContent = '<div>hey</div>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('hey'), {
      timeout: WAIT_TIMEOUT,
    });

    expect(
      fetchMock.mock.calls.filter((call) => call[0].endsWith('config.json'))
        .length,
    ).toBe(1);
  });

  it('runs fingerprint when config contains the correct fields', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    configContent = {
      flows: {
        'sign-in': {
          startScreenId: 'screen-0',
          fingerprintEnabled: true,
          fingerprintKey: 'fp-public-key',
        },
      },
    };

    pageContent = '<div>hey</div>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1" base-url="http://base.url"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('hey'), {
      timeout: WAIT_TIMEOUT,
    });
    expect(ensureFingerprintIds).toHaveBeenCalledWith(
      'fp-public-key',
      'http://base.url',
    );
  });

  it('should load sdk script when flow configured with sdk script', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    window.descope = { forter: mockClientScript };
    // We use specific connector which exists to test it all end to end
    // but we override it above
    const scriptId = 'forter';
    const resultKey = 'some-result-key';
    const resultValue = 'some-value';

    configContent = {
      flows: {
        'sign-in': {
          startScreenId: 'screen-0',
          sdkScripts: [
            {
              id: scriptId,
              initArgs: {
                siteId: 'some-site-id',
              },
              resultKey,
            },
          ],
        },
      },
    };

    pageContent = `<descope-button type="button" id="interactionId">Click</descope-button>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1" base-cdn-url="https://localhost" base-url="http://base.url"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('Click'), {
      timeout: WAIT_TIMEOUT,
    });
    scriptMock.onload();

    // ensure loadForter is called
    await waitFor(() =>
      expect(mockClientScript).toHaveBeenCalledWith(
        {
          siteId: 'some-site-id',
        },
        expect.objectContaining({
          baseUrl: 'http://base.url',
        }),
        expect.any(Function),
        expect.any(Object),
      ),
    );

    // trigger the callback, to simulate the script loaded
    // get the 3rd argument of the first call to loadForter
    const callback = (mockClientScript as jest.Mock).mock.calls[0][2];
    callback(resultValue);

    fireEvent.click(screen.getByShadowText('Click'));

    await waitFor(() => expect(startMock).toHaveBeenCalled());

    // Get start input is the 6th argument of the first call to start
    // ensure the result is passed to the start input
    const startInput = startMock.mock.calls[0][6];
    expect(startInput).toEqual(
      expect.objectContaining({
        [`${SDK_SCRIPT_RESULTS_KEY}.${scriptId}_${resultKey}`]: resultValue,
      }),
    );
  });

  it('it should set the theme based on the user parameter', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1" theme="light"></descope-wc>`;

    const shadowEle = document.getElementsByTagName('descope-wc')[0].shadowRoot;

    const rootEle = shadowEle?.querySelector('#root');

    await waitFor(() => expect(rootEle).toHaveAttribute('data-theme', 'light'));
  });

  it('it should set the theme based on OS settings when theme is "os"', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    window.matchMedia = jest.fn(() => ({ matches: true })) as any;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1" theme="os"></descope-wc>`;

    const shadowEle = document.getElementsByTagName('descope-wc')[0].shadowRoot;

    const rootEle = shadowEle?.querySelector('#root');

    await waitFor(() => expect(rootEle).toHaveAttribute('data-theme', 'dark'));
  });

  it('it should set the theme to light if not provided', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    window.matchMedia = jest.fn(() => ({ matches: true })) as any;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    const shadowEle = document.getElementsByTagName('descope-wc')[0].shadowRoot;

    const rootEle = shadowEle?.querySelector('#root');

    await waitFor(() => expect(rootEle).toHaveAttribute('data-theme', 'light'));
  });

  it('should throw an error when theme has a wrong value', async () => {
    const errorSpy = jest.spyOn(console, 'error');
    class Test extends DescopeWc {
      constructor() {
        super();
        Object.defineProperty(this, 'shadowRoot', {
          value: {
            isConnected: true,
            appendChild: () => {},
            host: { closest: () => true },
          },
        });
      }

      // eslint-disable-next-line class-methods-use-this
      public get projectId() {
        return '1';
      }

      // eslint-disable-next-line class-methods-use-this
      public get flowId() {
        return '1';
      }
    }

    customElements.define('test-theme', Test as any);
    document.body.innerHTML = `<h1>Custom element test</h1> <test-theme flow-id="otpSignInEmail" project-id="1" theme="lol"></descope-wc>`;

    await waitFor(
      () =>
        expect(errorSpy).toHaveBeenCalledWith(
          'Supported theme values are "light", "dark", or leave empty for using the OS theme',
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should show form validation error when input is not valid', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    pageContent =
      '<descope-button id="submitterId">click</descope-button><input id="email" name="email" required placeholder="email" class="descope-input"></input><span>hey</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('click'), {
      timeout: 20000,
    });

    const buttonEle = await screen.findByShadowText('click');

    const inputEle = screen.getByShadowPlaceholderText(
      'email',
    ) as HTMLInputElement;

    inputEle.reportValidity = jest.fn();
    inputEle.checkValidity = jest.fn();

    fireEvent.click(buttonEle);

    await waitFor(() => expect(inputEle.reportValidity).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(() => expect(inputEle.checkValidity).toHaveBeenCalled());
  });

  it('should call start with redirect url when provided', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    pageContent =
      '<descope-button id="submitterId">click</descope-button><input id="email" name="email"></input><span>hey</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1" redirect-url="http://custom.url"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('hey'), {
      timeout: 20000,
    });

    await waitFor(() =>
      expect(startMock).toHaveBeenCalledWith(
        'sign-in',
        expect.objectContaining({ redirectUrl: 'http://custom.url' }),
        undefined,
        '',
        '1.2.3',
        {
          otpSignInEmail: 1,
          'versioned-flow': 1,
        },
        {},
      ),
    );
  });

  it('should call start with form and client when provided', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    configContent = {
      ...configContent,
      flows: {
        'sign-in': { version: 1 },
      },
    };
    pageContent = '<div>hey</div>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1" form='{"displayName": "dn", "email": "test", "nested": { "key": "value" }, "another": { "value": "a", "disabled": true }}' client='{"email": "test2", "nested": { "key": "value" }}'></descope-wc>`;

    await waitFor(() => screen.findByShadowText('hey'), {
      timeout: 20000,
    });

    await waitFor(() =>
      expect(startMock).toHaveBeenCalledWith(
        'sign-in',
        expect.objectContaining({
          client: {
            email: 'test2',
            nested: { key: 'value' },
          },
        }),
        undefined,
        '',
        '1.2.3',
        {
          'sign-in': 1,
        },
        {
          email: 'test',
          'form.email': 'test',
          'nested.key': 'value',
          'form.nested.key': 'value',
          another: 'a',
          'form.another': 'a',
          'form.displayName': 'dn',
          'form.fullName': 'dn',
          displayName: 'dn',
          fullName: 'dn',
        },
      ),
    );
  });

  it('should call start with outbound attributes when provided', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    configContent = {
      ...configContent,
      flows: {
        'sign-in': { version: 1 },
      },
    };
    pageContent = '<div>hey</div>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1" outbound-app-id="app-id" outbound-app-scopes='["scope1", "scope2"]'></descope-wc>`;

    await waitFor(() => screen.findByShadowText('hey'), {
      timeout: 20000,
    });

    await waitFor(() =>
      expect(startMock).toHaveBeenCalledWith(
        'sign-in',
        expect.objectContaining({
          outboundAppId: 'app-id',
          outboundAppScopes: ['scope1', 'scope2'],
        }),
        undefined,
        '',
        '1.2.3',
        {
          'sign-in': 1,
        },
        {},
      ),
    );
  });

  it('should call start with refresh cookie name when provided', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    configContent = {
      ...configContent,
      flows: {
        'sign-in': { version: 1 },
      },
    };
    pageContent = '<div>hey</div>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1" refresh-cookie-name="cookie-1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('hey'), {
      timeout: 20000,
    });

    await waitFor(() =>
      expect(createSdk).toHaveBeenCalledWith(
        expect.objectContaining({
          refreshCookieName: 'cookie-1',
        }),
      ),
    );
  });

  describe('poll', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('Should clear timeout when user clicks a button', async () => {
      jest.spyOn(global, 'clearTimeout');

      startMock.mockReturnValueOnce(generateSdkResponse());

      pageContent =
        '<descope-button id="submitterId">click</descope-button><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      jest.runAllTimers();

      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: 20000,
      });

      /*  next returns
         - a poll response
         - another poll response
         - a screen response
      */
      nextMock
        .mockReturnValueOnce(
          generateSdkResponse({
            executionId: 'e1',
            stepId: 's1',
            screenId: '1',
            action: RESPONSE_ACTIONS.poll,
          }),
        )
        .mockReturnValueOnce(
          generateSdkResponse({
            action: RESPONSE_ACTIONS.poll,
          }),
        )
        .mockReturnValueOnce(
          generateSdkResponse({
            screenId: '2',
          }),
        );

      fireEvent.click(screen.getByShadowText('click'));

      // first call is the click call
      await waitFor(() =>
        expect(nextMock).toHaveBeenNthCalledWith(
          1,
          '0',
          '0',
          'submitterId',
          1,
          '1.2.3',
          expect.any(Object),
          false,
        ),
      );

      // first call is the click call
      await waitFor(
        () =>
          expect(nextMock).toHaveBeenNthCalledWith(
            2,
            '0',
            '0',
            CUSTOM_INTERACTIONS.polling,
            1,
            '1.2.3',
            expect.any(Object),
          ),
        {
          timeout: 8000,
        },
      );

      // second call is the click call
      await waitFor(
        () =>
          expect(nextMock).toHaveBeenNthCalledWith(
            3,
            '0',
            '0',
            CUSTOM_INTERACTIONS.polling,
            1,
            '1.2.3',
            expect.any(Object),
          ),
        {
          timeout: 8000,
        },
      );

      await waitFor(() => expect(clearTimeout).toHaveBeenCalled(), {
        timeout: 8000,
      });
    });

    it('When has polling element - next with "polling", and check that timeout is set properly', async () => {
      jest.spyOn(global, 'setTimeout');

      startMock.mockReturnValueOnce(generateSdkResponse());

      nextMock.mockReturnValueOnce(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.poll,
        }),
      );

      pageContent = '<div data-type="polling">...</div><span>It works!</span>';
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      jest.runAllTimers();

      await waitFor(
        () =>
          expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 2000),
        {
          timeout: WAIT_TIMEOUT,
        },
      );
    });

    it('When screen has polling element and next returns the same response, should trigger polling again', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      nextMock.mockReturnValueOnce(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.poll,
        }),
      );

      pageContent =
        '<div data-type="polling">...</div><descope-button>click</descope-button><span>It works!</span>';
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      // Wait for first polling
      await waitFor(
        () =>
          expect(nextMock).toHaveBeenCalledWith(
            '0',
            '0',
            CUSTOM_INTERACTIONS.polling,
            1,
            '1.2.3',
            {},
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      // Reset mock to ensure it is triggered again with polling
      nextMock.mockClear();
      nextMock.mockReturnValueOnce(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.poll,
        }),
      );

      // Click another button, which returns the same screen
      fireEvent.click(screen.getByShadowText('click'));

      // Ensure polling is triggered again
      await waitFor(
        () =>
          expect(nextMock).toHaveBeenCalledWith(
            '0',
            '0',
            CUSTOM_INTERACTIONS.polling,
            1,
            '1.2.3',
            {},
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );
    });

    it('When has polling element, and next poll returns polling response', async () => {
      jest.spyOn(global, 'setTimeout');

      startMock.mockReturnValueOnce(generateSdkResponse());

      nextMock.mockReturnValue(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.poll,
        }),
      );

      pageContent = '<div data-type="polling">...</div><span>It works!</span>';
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      jest.runAllTimers();

      await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(3), {
        timeout: WAIT_TIMEOUT * 2,
      });
    });

    it('When has polling element, and next poll returns completed response', async () => {
      // Ensure previous tests' stubs do not interfere
      startMock.mockReset();
      nextMock.mockReset();
      startMock.mockReturnValueOnce(generateSdkResponse());

      jest.spyOn(global, 'setTimeout');

      nextMock
        .mockReturnValueOnce(
          generateSdkResponse({
            action: RESPONSE_ACTIONS.poll,
          }),
        )
        .mockReturnValueOnce(
          generateSdkResponse({
            status: 'completed',
          }),
        );

      pageContent = '<div data-type="polling">...</div><span>It works!</span>';
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const onSuccess = jest.fn();

      const wcEle = document.getElementsByTagName('descope-wc')[0];

      wcEle.addEventListener('success', onSuccess);

      jest.runAllTimers();

      await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(2), {
        timeout: 20000,
      });

      await waitFor(
        () =>
          expect(onSuccess).toHaveBeenCalledWith(
            expect.objectContaining({ detail: { refreshJwt: 'refreshJwt' } }),
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      wcEle.removeEventListener('success', onSuccess);
    });
  });

  it(
    'should not have concurrent polling calls',
    async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      const MIN_NUM_OF_RUNS = 15;

      let isRunning = false;
      let counter = 0;
      let isConcurrentPolling = false;

      nextMock.mockImplementation(
        () =>
          new Promise((resolve) => {
            if (isRunning) {
              isConcurrentPolling = true;
            }
            counter += 1;
            isRunning = true;
            setTimeout(() => {
              resolve(
                generateSdkResponse({
                  action: RESPONSE_ACTIONS.poll,
                }),
              );

              isRunning = false;
            }, 100);
          }),
      );

      pageContent = '<div data-type="polling">...</div><span>It works!</span>';
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => expect(counter).toBeGreaterThan(MIN_NUM_OF_RUNS), {
        timeout: WAIT_TIMEOUT * 5,
      });

      if (isConcurrentPolling) throw new Error('Concurrent polling detected');
    },
    WAIT_TIMEOUT * 5,
  );

  describe('key press handler management', () => {
    it('should disable key press handler when rendering custom screen', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      pageContent = `<div>Loaded123</div><descope-button id="submit">Submit</descope-button>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc') as any;

      // Set up onScreenUpdate to return true for custom screen
      const onScreenUpdate = jest.fn(() => true);
      descopeWc.onScreenUpdate = onScreenUpdate;

      // Spy on the key press handler methods before initialization
      const disableKeyPressHandlerSpy = jest.spyOn(
        descopeWc,
        'disableKeyPressHandler',
      );
      const handleKeyPressSpy = jest.spyOn(descopeWc, 'handleKeyPress');

      // Wait for onScreenUpdate to be called
      await waitFor(() => expect(onScreenUpdate).toHaveBeenCalledTimes(1), {
        timeout: WAIT_TIMEOUT,
      });

      // Verify key press handler is disabled for custom screens
      await waitFor(
        () => expect(disableKeyPressHandlerSpy).toHaveBeenCalled(),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      // Verify key press handler is not enabled
      expect(handleKeyPressSpy).not.toHaveBeenCalled();

      // Test that Enter key doesn't trigger form submission when custom screen is rendered
      const rootEle = descopeWc.shadowRoot.querySelector('#root');
      expect(rootEle.onkeydown).toBeNull();
    });

    it('should enable key press handler when rendering regular flow screen', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      pageContent = `<div>Loaded123</div><descope-button id="submit">Submit</descope-button>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc') as any;

      // Set up onScreenUpdate to return false for regular screen
      const onScreenUpdate = jest.fn(() => false);
      descopeWc.onScreenUpdate = onScreenUpdate;

      // Spy on the key press handler methods before initialization
      const handleKeyPressSpy = jest.spyOn(descopeWc, 'handleKeyPress');
      const disableKeyPressHandlerSpy = jest.spyOn(
        descopeWc,
        'disableKeyPressHandler',
      );

      // Wait for onScreenUpdate to be called
      await waitFor(() => expect(onScreenUpdate).toHaveBeenCalledTimes(1), {
        timeout: WAIT_TIMEOUT,
      });

      // Wait for the content to be rendered (means regular screen is shown)
      await waitFor(() => screen.getByShadowText('Loaded123'), {
        timeout: WAIT_TIMEOUT,
      });

      // Verify key press handler is enabled for regular screens
      await waitFor(() => expect(handleKeyPressSpy).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });

      // Verify key press handler is not disabled
      expect(disableKeyPressHandlerSpy).not.toHaveBeenCalled();

      // Test that Enter key handler is properly set
      const rootEle = descopeWc.shadowRoot.querySelector('#root');
      expect(rootEle.onkeydown).toEqual(expect.any(Function));
    });

    it('should enable key press handler when onScreenUpdate is not set', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      pageContent = `<div>Loaded123</div><descope-button id="submit">Submit</descope-button>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc') as any;
      // No onScreenUpdate set - should render regular screen

      // Spy on the key press handler methods
      const handleKeyPressSpy = jest.spyOn(descopeWc, 'handleKeyPress');
      const disableKeyPressHandlerSpy = jest.spyOn(
        descopeWc,
        'disableKeyPressHandler',
      );

      // Wait for the content to be rendered
      await waitFor(() => screen.getByShadowText('Loaded123'), {
        timeout: WAIT_TIMEOUT,
      });

      // Verify key press handler is enabled for regular screens
      await waitFor(() => expect(handleKeyPressSpy).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });

      // Verify key press handler is not disabled
      expect(disableKeyPressHandlerSpy).not.toHaveBeenCalled();

      // Test that Enter key handler is properly set
      const rootEle = descopeWc.shadowRoot.querySelector('#root');
      expect(rootEle.onkeydown).toEqual(expect.any(Function));
    });

    it('should toggle key press handler when switching between custom and regular screens', async () => {
      startMock.mockReturnValue(generateSdkResponse());
      nextMock.mockReturnValue(generateSdkResponse({ screenId: '1' }));

      pageContent = `<div>Loaded123</div><descope-button id="submit">Submit</descope-button>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc') as any;

      // Start with custom screen
      let shouldShowCustomScreen = true;
      const onScreenUpdate = jest.fn(() => shouldShowCustomScreen);
      descopeWc.onScreenUpdate = onScreenUpdate;

      // Spy on the key press handler methods
      const handleKeyPressSpy = jest.spyOn(descopeWc, 'handleKeyPress');
      const disableKeyPressHandlerSpy = jest.spyOn(
        descopeWc,
        'disableKeyPressHandler',
      );

      // Wait for first onScreenUpdate call (custom screen)
      await waitFor(() => expect(onScreenUpdate).toHaveBeenCalledTimes(1), {
        timeout: WAIT_TIMEOUT,
      });

      // First call should disable key press handler (custom screen)
      await waitFor(
        () => expect(disableKeyPressHandlerSpy).toHaveBeenCalledTimes(1),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      // Switch to regular screen
      shouldShowCustomScreen = false;

      // Get the next function from the onScreenUpdate call
      const next = onScreenUpdate.mock.calls[0][2];

      // Clear spies to track next calls
      handleKeyPressSpy.mockClear();
      disableKeyPressHandlerSpy.mockClear();

      // Trigger transition to regular screen
      next('next', {});

      // Wait for second onScreenUpdate call
      await waitFor(() => expect(onScreenUpdate).toHaveBeenCalledTimes(2), {
        timeout: WAIT_TIMEOUT,
      });

      // Should now enable key press handler (regular screen)
      await waitFor(() => expect(handleKeyPressSpy).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });

      // Should not disable again
      expect(disableKeyPressHandlerSpy).not.toHaveBeenCalled();

      // Test that Enter key handler is properly set
      const rootEle = descopeWc.shadowRoot.querySelector('#root');
      expect(rootEle.onkeydown).toEqual(expect.any(Function));
    });
  });

  describe('native', () => {
    it('Should prepare a callback for a native bridge response and broadcast an event when receiving a nativeBridge action', async () => {
      startMock.mockReturnValueOnce(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.nativeBridge,
          nativeResponseType: 'oauthNative',
          nativeResponsePayload: { start: {} },
        }),
      );

      nextMock.mockReturnValueOnce(
        generateSdkResponse({
          status: 'completed',
        }),
      );

      pageContent = '<div data-type="polling">...</div><span>It works!</span>';
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const onSuccess = jest.fn();
      const onBridge = jest.fn();

      const wcEle = document.getElementsByTagName('descope-wc')[0];

      // nativeCallbacks.complete starts as undefined
      expect(wcEle.nativeCallbacks.complete).not.toBeDefined();

      wcEle.addEventListener('success', onSuccess);
      wcEle.addEventListener('bridge', onBridge);

      // after start 'nativeComplete' is initialized and a 'bridge' event should be dispatched
      await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(
        () => expect(wcEle.nativeCallbacks.complete).toBeDefined(),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      await waitFor(
        () =>
          expect(onBridge).toHaveBeenCalledWith(
            expect.objectContaining({
              detail: {
                type: 'oauthNative',
                payload: { start: {} },
              },
            }),
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      // simulate a native complete call and expect the 'next' call
      await wcEle.nativeResume(
        'oauthNative',
        JSON.stringify({ response: true }),
      );
      await waitFor(
        () =>
          expect(nextMock).toHaveBeenCalledWith(
            '0',
            '0',
            CUSTOM_INTERACTIONS.submit,
            1,
            '1.2.3',
            { response: true },
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      await waitFor(
        () =>
          expect(onSuccess).toHaveBeenCalledWith(
            expect.objectContaining({ detail: { refreshJwt: 'refreshJwt' } }),
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      wcEle.removeEventListener('success', onSuccess);
      wcEle.removeEventListener('bridge', onBridge);
    });

    it('Should handle a nativeResume oauthWeb response', async () => {
      startMock.mockReturnValueOnce(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.nativeBridge,
          nativeResponseType: 'oauthWeb',
          nativeResponsePayload: { url: 'https://oauthprovider.com' },
        }),
      );

      nextMock.mockReturnValueOnce(
        generateSdkResponse({
          status: 'completed',
        }),
      );

      pageContent = '<div data-type="polling">...</div><span>It works!</span>';
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const onSuccess = jest.fn();
      const onBridge = jest.fn();

      const wcEle = document.getElementsByTagName('descope-wc')[0];

      // nativeComplete starts as undefined
      expect(wcEle.nativeCallbacks.complete).not.toBeDefined();

      wcEle.addEventListener('success', onSuccess);
      wcEle.addEventListener('bridge', onBridge);

      // after start 'nativeComplete' is initialized and a 'bridge' event should be dispatched
      await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(
        () => expect(wcEle.nativeCallbacks.complete).toBeDefined(),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      await waitFor(
        () =>
          expect(onBridge).toHaveBeenCalledWith(
            expect.objectContaining({
              detail: {
                type: 'oauthWeb',
                payload: { url: 'https://oauthprovider.com' },
              },
            }),
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      // simulate a native resume call and expect the 'next' call
      await wcEle.nativeResume(
        'oauthWeb',
        JSON.stringify({ url: 'https://deeplink.com?code=code123' }),
      );
      await waitFor(
        () =>
          expect(nextMock).toHaveBeenCalledWith(
            '0',
            '0',
            CUSTOM_INTERACTIONS.submit,
            1,
            '1.2.3',
            { exchangeCode: 'code123', idpInitiated: true },
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      await waitFor(
        () =>
          expect(onSuccess).toHaveBeenCalledWith(
            expect.objectContaining({ detail: { refreshJwt: 'refreshJwt' } }),
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      wcEle.removeEventListener('success', onSuccess);
      wcEle.removeEventListener('bridge', onBridge);
    });

    it('Should handle a nativeResume call for magic link', async () => {
      jest.spyOn(global, 'clearTimeout');

      startMock.mockReturnValueOnce(generateSdkResponse());

      pageContent =
        '<descope-button id="submitterId">click</descope-button><span>It works!</span>';
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const onSuccess = jest.fn();

      const wcEle = document.getElementsByTagName('descope-wc')[0];

      wcEle.addEventListener('success', onSuccess);

      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: 20000,
      });

      nextMock
        .mockReturnValueOnce(
          generateSdkResponse({
            action: RESPONSE_ACTIONS.poll,
          }),
        )
        .mockReturnValueOnce(
          generateSdkResponse({
            status: 'completed',
          }),
        );

      // user clicks
      fireEvent.click(screen.getByShadowText('click'));

      // at least one poll
      await waitFor(() =>
        expect(nextMock).toHaveBeenNthCalledWith(
          1,
          '0',
          '0',
          'submitterId',
          1,
          '1.2.3',
          expect.any(Object),
          false,
        ),
      );

      // simulate a native resume call and expect the 'next' call to contain the token
      await wcEle.nativeResume(
        'magicLink',
        JSON.stringify({
          url: 'https://deeplink.com?descope-login-flow=native%7C%23%7C2oeoLE7E8PJaR9qRLgT1rjwgiJP_2.end&t=token123',
        }),
      );
      await waitFor(
        () =>
          expect(nextMock).toHaveBeenCalledWith(
            '0',
            '2.end',
            CUSTOM_INTERACTIONS.submit,
            1,
            '1.2.3',
            expect.objectContaining({ token: 'token123' }),
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      // expect success to be called
      await waitFor(
        () =>
          expect(onSuccess).toHaveBeenCalledWith(
            expect.objectContaining({ detail: { refreshJwt: 'refreshJwt' } }),
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      // expect the timeout to have been cleared
      await waitFor(() => expect(clearTimeout).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });

      wcEle.removeEventListener('success', onSuccess);
    });
  });

  describe('condition', () => {
    beforeEach(() => {
      localStorage.removeItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY);
    });
    it('Should fetch met screen when condition is met', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      localStorage.setItem(
        DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
        '{"authMethod":"otp"}',
      );
      getLastUserLoginIdMock.mockReturnValue('abc');

      configContent = {
        ...configContent,
        flows: {
          'sign-in': {
            condition: {
              key: 'lastAuth.loginId',
              met: {
                interactionId: 'gbutpyzvtgs',
                screenId: 'met',
              },
              operator: 'not-empty',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
          },
        },
      };

      pageContent = '<div>hey</div>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('hey'), {
        timeout: WAIT_TIMEOUT,
      });
      expect(startMock).not.toBeCalled();
      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/met.html`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object),
      );
    });

    it('Should fetch unmet screen when condition is not met', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      localStorage.setItem(
        DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
        '{"authMethod":"otp"}',
      );

      configContent = {
        ...configContent,
        flows: {
          'sign-in': {
            condition: {
              key: 'lastAuth.loginId',
              met: {
                interactionId: 'gbutpyzvtgs',
                screenId: 'met',
              },
              operator: 'not-empty',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
          },
        },
      };

      pageContent = '<div>hey</div>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('hey'), {
        timeout: WAIT_TIMEOUT,
      });
      expect(startMock).not.toBeCalled();
      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/unmet.html`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object),
      );
    });

    it('Should send condition interaction ID on submit click', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      localStorage.setItem(
        DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
        '{"authMethod":"otp"}',
      );
      getLastUserLoginIdMock.mockReturnValue('abc');

      const conditionInteractionId = 'gbutpyzvtgs';
      configContent = {
        ...configContent,
        flows: {
          'sign-in': {
            condition: {
              key: 'lastAuth.loginId',
              met: {
                interactionId: conditionInteractionId,
                screenId: 'met',
              },
              operator: 'not-empty',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
            version: 1,
          },
        },
      };

      pageContent = `<descope-button type="button" id="interactionId">Click</descope-button>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.findByShadowText('Click'), {
        timeout: WAIT_TIMEOUT,
      });

      pageContent =
        '<input id="email"></input><input id="code"></input><span>It works!</span>';

      fireEvent.click(screen.getByShadowText('Click'));

      await waitFor(() =>
        expect(startMock).toBeCalledWith(
          'sign-in',
          {
            ...defaultOptionsValues,
            lastAuth: { authMethod: 'otp' },
            preview: false,
          },
          conditionInteractionId,
          'interactionId',
          '1.2.3',
          {
            'sign-in': 1,
          },
          { origin: 'http://localhost' },
          false,
        ),
      );
    });
    it('Should call start with code and idpInitiated when idpInitiated condition is met', async () => {
      window.location.search = `?${URL_CODE_PARAM_NAME}=code1`;
      localStorage.setItem(
        DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
        '{"authMethod":"otp"}',
      );
      getLastUserLoginIdMock.mockReturnValue('abc');
      configContent = {
        ...configContent,
        flows: {
          'sign-in': {
            condition: {
              key: 'idpInitiated',
              met: {
                interactionId: 'gbutpyzvtgs',
              },
              operator: 'not-empty',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
            version: 1,
          },
        },
      };

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;
      await waitFor(
        () =>
          expect(startMock).toHaveBeenCalledWith(
            'sign-in',
            {
              ...defaultOptionsValues,
              lastAuth: { authMethod: 'otp' },
            },
            undefined,
            '',
            '1.2.3',
            {
              'sign-in': 1,
            },
            {
              exchangeCode: 'code1',
              idpInitiated: true,
            },
          ),
        { timeout: WAIT_TIMEOUT },
      );
    });

    it('Should fetch unmet screen when idpInitiated condition is not met', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      configContent = {
        ...configContent,
        flows: {
          'sign-in': {
            condition: {
              key: 'idpInitiated',
              met: {
                interactionId: 'gbutpyzvtgs',
              },
              operator: 'is-true',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
          },
        },
      };

      pageContent = '<div>hey</div>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('hey'), {
        timeout: WAIT_TIMEOUT,
      });
      expect(startMock).not.toBeCalled();
      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/unmet.html`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object),
      );
    });

    it('Should call start with token and externalToken when externalToken condition is met', async () => {
      window.location.search = `?${URL_TOKEN_PARAM_NAME}=code1`;
      localStorage.setItem(
        DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
        '{"authMethod":"otp"}',
      );
      getLastUserLoginIdMock.mockReturnValue('abc');
      configContent = {
        flows: {
          'sign-in': {
            condition: {
              key: 'externalToken',
              met: {
                interactionId: 'gbutpyzvtgs',
              },
              operator: 'not-empty',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
            version: 1,
          },
        },
      };

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;
      await waitFor(
        () =>
          expect(startMock).toHaveBeenCalledWith(
            'sign-in',
            {
              ...defaultOptionsValues,
              lastAuth: { authMethod: 'otp' },
            },
            undefined,
            '',
            undefined,
            {
              'sign-in': 1,
            },
            {
              token: 'code1',
            },
          ),
        { timeout: WAIT_TIMEOUT },
      );
    });

    it('Should fetch unmet screen when externalToken condition is not met', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      configContent = {
        flows: {
          'sign-in': {
            condition: {
              key: 'externalToken',
              met: {
                interactionId: 'gbutpyzvtgs',
              },
              operator: 'is-true',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
          },
        },
      };

      pageContent = '<div>hey</div>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('hey'), {
        timeout: WAIT_TIMEOUT,
      });
      expect(startMock).not.toBeCalled();
      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/unmet.html`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object),
      );
    });

    it('should call start with redirect auth data and keep it in the url', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      pageContent = '<span>It works!</span>';
      configContent = {
        ...configContent,
        flows: {
          'sign-in': { version: 0 },
        },
      };
      const challenge = window.btoa('hash');
      const callback = 'https://mycallback.com';
      const backupCallback = 'myapp://auth';
      const encodedChallenge = encodeURIComponent(challenge);
      const encodedCallback = encodeURIComponent(callback);
      const encodedBackupCallback = encodeURIComponent(backupCallback);
      const redirectAuthQueryParams = `?${URL_REDIRECT_AUTH_CHALLENGE_PARAM_NAME}=${encodedChallenge}&${URL_REDIRECT_AUTH_CALLBACK_PARAM_NAME}=${encodedCallback}&${URL_REDIRECT_AUTH_BACKUP_CALLBACK_PARAM_NAME}=${encodedBackupCallback}&${URL_REDIRECT_AUTH_INITIATOR_PARAM_NAME}=android`;
      window.location.search = redirectAuthQueryParams;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(
        () =>
          expect(startMock).toHaveBeenCalledWith(
            'sign-in',
            {
              ...defaultOptionsValues,
              redirectAuth: {
                callbackUrl: callback,
                codeChallenge: challenge,
                backupCallbackUri: backupCallback,
              },
            },
            undefined,
            '',
            '1.2.3',
            {
              'sign-in': 0,
            },
            {},
          ),
        { timeout: WAIT_TIMEOUT },
      );
      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: 20000,
      });
      await waitFor(() =>
        expect(window.location.search).toBe(redirectAuthQueryParams),
      );
    });

    it('should call start with redirect auth data and token and keep it in the url', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      pageContent = '<span>It works!</span>';
      configContent = {
        ...configContent,
        flows: {
          'sign-in': { version: 0 },
        },
      };
      const token = 'token1';
      const challenge = window.btoa('hash');
      const callback = 'https://mycallback.com';
      const encodedChallenge = encodeURIComponent(challenge);
      const encodedCallback = encodeURIComponent(callback);
      const redirectAuthQueryParams = `?${URL_REDIRECT_AUTH_CHALLENGE_PARAM_NAME}=${encodedChallenge}&${URL_REDIRECT_AUTH_CALLBACK_PARAM_NAME}=${encodedCallback}&${URL_REDIRECT_AUTH_INITIATOR_PARAM_NAME}=android`;
      window.location.search = `${redirectAuthQueryParams}&${URL_TOKEN_PARAM_NAME}=${token}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(
        () =>
          expect(startMock).toHaveBeenCalledWith(
            'sign-in',
            {
              ...defaultOptionsValues,
              redirectAuth: {
                callbackUrl: callback,
                codeChallenge: challenge,
                backupCallbackUri: null,
              },
            },
            undefined,
            '',
            '1.2.3',
            {
              'sign-in': 0,
            },
            { token },
          ),
        { timeout: WAIT_TIMEOUT },
      );
      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: 20000,
      });
      await waitFor(() =>
        expect(window.location.search).toBe(redirectAuthQueryParams),
      );
    });

    it('should call start with oidc idp flag and clear it from url', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      pageContent = '<span>It works!</span>';
      configContent = {
        ...configContent,
        flows: {
          'sign-in': { version: 0 },
        },
      };
      const oidcIdpStateId = 'abcdefgh';
      const encodedOidcIdpStateId = encodeURIComponent(oidcIdpStateId);
      window.location.search = `?${OIDC_IDP_STATE_ID_PARAM_NAME}=${encodedOidcIdpStateId}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(
        () =>
          expect(startMock).toHaveBeenCalledWith(
            'sign-in',
            {
              ...defaultOptionsValues,
              oidcIdpStateId: 'abcdefgh',
            },
            undefined,
            '',
            '1.2.3',
            {
              'sign-in': 0,
            },
            {},
          ),
        { timeout: WAIT_TIMEOUT },
      );
      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: 20000,
      });
      await waitFor(() => expect(window.location.search).toBe(''));
    });

    it('should call start with oidc idp when there is a start screen is configured', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      configContent = {
        ...configContent,
        flows: {
          'sign-in': { startScreenId: 'screen-0' },
        },
      };

      pageContent =
        '<descope-button>click</descope-button><span>It works!</span>';

      const oidcIdpStateId = 'abcdefgh';
      const encodedOidcIdpStateId = encodeURIComponent(oidcIdpStateId);
      window.location.search = `?${OIDC_IDP_STATE_ID_PARAM_NAME}=${encodedOidcIdpStateId}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: 20000,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });
    });

    it('should call start with saml idp when there is a start screen is configured', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      configContent = {
        flows: {
          'sign-in': { startScreenId: 'screen-0' },
        },
      };

      pageContent =
        '<descope-button>click</descope-button><span>It works!</span>';

      const samlIdpStateId = 'abcdefgh';
      const encodedSamlIdpStateId = encodeURIComponent(samlIdpStateId);
      window.location.search = `?${SAML_IDP_STATE_ID_PARAM_NAME}=${encodedSamlIdpStateId}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT * 2,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });
    });

    it('should call start with saml idp with username when there is a start screen is configured', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      configContent = {
        flows: {
          'sign-in': { startScreenId: 'screen-0' },
        },
      };

      pageContent =
        '<descope-button>click</descope-button><span>It works!</span>';

      const samlIdpUsername = 'abcdefgh';
      const encodedSamlIdpUsername = encodeURIComponent(samlIdpUsername);
      window.location.search = `?${SAML_IDP_USERNAME_PARAM_NAME}=${encodedSamlIdpUsername}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(() => expect(nextMock).toHaveBeenCalled());
    });

    it('should call start with saml idp flag and clear it from url', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      pageContent = '<span>It works!</span>';
      configContent = {
        ...configContent,
        flows: {
          'sign-in': { version: 0 },
        },
      };
      const samlIdpStateId = 'abcdefgh';
      const encodedSamlIdpStateId = encodeURIComponent(samlIdpStateId);
      window.location.search = `?${SAML_IDP_STATE_ID_PARAM_NAME}=${encodedSamlIdpStateId}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(
        () =>
          expect(startMock).toHaveBeenCalledWith(
            'sign-in',
            {
              ...defaultOptionsValues,
              samlIdpStateId: 'abcdefgh',
            },
            undefined,
            '',
            '1.2.3',
            {
              'sign-in': 0,
            },
            {},
          ),
        { timeout: WAIT_TIMEOUT },
      );
      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });
      await waitFor(() => expect(window.location.search).toBe(''));
    });

    it('should call start with saml idp with username flag and clear it from url', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      pageContent = '<span>It works!</span>';
      configContent = {
        ...configContent,
        flows: {
          'sign-in': { version: 0 },
        },
      };
      const samlIdpStateId = 'abcdefgh';
      const encodedSamlIdpStateId = encodeURIComponent(samlIdpStateId);
      const samlIdpUsername = 'dummyUser';
      const encodedSamlIdpUsername = encodeURIComponent(samlIdpUsername);
      window.location.search = `?${SAML_IDP_STATE_ID_PARAM_NAME}=${encodedSamlIdpStateId}&${SAML_IDP_USERNAME_PARAM_NAME}=${encodedSamlIdpUsername}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(
        () =>
          expect(startMock).toHaveBeenCalledWith(
            'sign-in',
            {
              ...defaultOptionsValues,
              samlIdpStateId: 'abcdefgh',
              samlIdpUsername: 'dummyUser',
            },
            undefined,
            '',
            '1.2.3',
            {
              'sign-in': 0,
            },
            {},
          ),
        { timeout: WAIT_TIMEOUT },
      );
      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });
      await waitFor(() => expect(window.location.search).toBe(''));
    });

    it('should call start with descope idp initiated flag and clear it from url', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      pageContent = '<span>It works!</span>';
      configContent = {
        ...configContent,
        flows: {
          'sign-in': { version: 0 },
        },
      };
      const descopeIdpInitiated = 'true';
      window.location.search = `?${DESCOPE_IDP_INITIATED_PARAM_NAME}=${descopeIdpInitiated}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(
        () =>
          expect(startMock).toHaveBeenCalledWith(
            'sign-in',
            {
              ...defaultOptionsValues,
              descopeIdpInitiated: true,
            },
            undefined,
            '',
            '1.2.3',
            {
              'sign-in': 0,
            },
            {
              idpInitiated: true,
            },
          ),
        { timeout: WAIT_TIMEOUT },
      );
      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });
      await waitFor(() => expect(window.location.search).toBe(''));
    });

    it('should call start with ssoAppId when there is a start screen is configured', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      configContent = {
        flows: {
          'sign-in': { startScreenId: 'screen-0' },
        },
      };

      pageContent =
        '<descope-button>click</descope-button><span>It works!</span>';

      const ssoAppId = 'abcdefgh';
      const encodedSSOAppId = encodeURIComponent(ssoAppId);
      window.location.search = `?${SSO_APP_ID_PARAM_NAME}=${encodedSSOAppId}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });
    });

    it('should call start with ssoAppId flag and clear it from url', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      pageContent = '<span>It works!</span>';
      configContent = {
        flows: {
          'sign-in': { startScreenId: 'screen-0' },
        },
        componentsVersion: '1.2.3',
      };

      const ssoAppId = 'abcdefgh';
      const encodedSSOAppId = encodeURIComponent(ssoAppId);
      window.location.search = `?${SSO_APP_ID_PARAM_NAME}=${encodedSSOAppId}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(
        () =>
          expect(startMock).toHaveBeenCalledWith(
            'sign-in',
            {
              ...defaultOptionsValues,
              ssoAppId: 'abcdefgh',
            },
            undefined,
            '',
            '1.2.3',
            {
              'sign-in': 0,
            },
            {},
          ),
        { timeout: WAIT_TIMEOUT },
      );
      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });
      await waitFor(() => expect(window.location.search).toBe(''));
    });
  });

  it('should call start with oidc idp with oidcLoginHint flag and clear it from url', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    pageContent = '<span>It works!</span>';

    const oidcStateId = 'abcdefgh';
    const encodedOidcStateId = encodeURIComponent(oidcStateId);
    const oidcLoginHint = 'dummyUser';
    const encodedOidcLoginHint = encodeURIComponent(oidcLoginHint);
    window.location.search = `?${OIDC_IDP_STATE_ID_PARAM_NAME}=${encodedOidcStateId}&${OIDC_LOGIN_HINT_PARAM_NAME}=${encodedOidcLoginHint}`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(startMock).toHaveBeenCalledWith(
          'sign-in',
          {
            ...defaultOptionsValues,
            oidcIdpStateId: 'abcdefgh',
            oidcLoginHint: 'dummyUser',
          },
          undefined,
          '',
          '1.2.3',
          {
            otpSignInEmail: 1,
            'versioned-flow': 1,
          },
          {
            externalId: 'dummyUser',
          },
        ),
      { timeout: WAIT_TIMEOUT },
    );
    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(() => expect(window.location.search).toBe(''));
  });

  it('should call start with oidc idp with loginHint when there is a start screen is configured', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    configContent = {
      flows: {
        'sign-in': { startScreenId: 'screen-0' },
      },
    };

    pageContent =
      '<descope-button>click</descope-button><span>It works!</span>';

    const oidcLoginHint = 'abcdefgh';
    const encodedOidcLoginHint = encodeURIComponent(oidcLoginHint);
    window.location.search = `?${OIDC_LOGIN_HINT_PARAM_NAME}=${encodedOidcLoginHint}`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(() => expect(startMock).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(() => expect(nextMock).toHaveBeenCalled());
  });

  it('should call start with oidc idp with oidcPrompt flag and clear it from url', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    pageContent = '<span>It works!</span>';

    const oidcStateId = 'abcdefgh';
    const encodedOidcStateId = encodeURIComponent(oidcStateId);
    const oidcPrompt = 'login';
    const encodedOidcPrompt = encodeURIComponent(oidcPrompt);
    window.location.search = `?${OIDC_IDP_STATE_ID_PARAM_NAME}=${encodedOidcStateId}&${OIDC_PROMPT_PARAM_NAME}=${encodedOidcPrompt}`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(startMock).toHaveBeenCalledWith(
          'sign-in',
          {
            ...defaultOptionsValues,
            oidcIdpStateId: 'abcdefgh',
            oidcPrompt: 'login',
          },
          undefined,
          '',
          '1.2.3',
          {
            otpSignInEmail: 1,
            'versioned-flow': 1,
          },
          {},
        ),
      { timeout: WAIT_TIMEOUT },
    );
    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(() => expect(window.location.search).toBe(''));
  });

  it('should call start with oidc idp with oidcPrompt when there is a start screen is configured', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    configContent = {
      flows: {
        'sign-in': { startScreenId: 'screen-0' },
      },
    };

    pageContent =
      '<descope-button>click</descope-button><span>It works!</span>';

    const oidcPrompt = 'login';
    const encodedOidcPrompt = encodeURIComponent(oidcPrompt);
    window.location.search = `?${OIDC_PROMPT_PARAM_NAME}=${encodedOidcPrompt}`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(() => expect(startMock).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(() => expect(nextMock).toHaveBeenCalled());
  });

  it('should call start with oidc idp with oidcErrorRedirectUri flag and clear it from url', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    pageContent = '<span>It works!</span>';

    const oidcStateId = 'abcdefgh';
    const encodedOidcStateId = encodeURIComponent(oidcStateId);
    const oidcErrorRedirectUri = 'https://some.test';
    const encodedOidcErrorRedirectUri =
      encodeURIComponent(oidcErrorRedirectUri);
    window.location.search = `?${OIDC_IDP_STATE_ID_PARAM_NAME}=${encodedOidcStateId}&${OIDC_ERROR_REDIRECT_URI_PARAM_NAME}=${encodedOidcErrorRedirectUri}`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(startMock).toHaveBeenCalledWith(
          'sign-in',
          {
            ...defaultOptionsValues,
            oidcIdpStateId: 'abcdefgh',
            oidcErrorRedirectUri: 'https://some.test',
          },
          undefined,
          '',
          '1.2.3',
          {
            otpSignInEmail: 1,
            'versioned-flow': 1,
          },
          {},
        ),
      { timeout: WAIT_TIMEOUT },
    );
    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(() => expect(window.location.search).toBe(''));
  });

  it('should call start with oidc idp with oidcErrorRedirectUri when there is a start screen is configured', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    configContent = {
      flows: {
        'sign-in': { startScreenId: 'screen-0' },
      },
    };

    pageContent =
      '<descope-button>click</descope-button><span>It works!</span>';

    const oidcErrorRedirectUri = 'https://some.test';
    const encodedOidcErrorRedirectUri =
      encodeURIComponent(oidcErrorRedirectUri);
    window.location.search = `?${OIDC_ERROR_REDIRECT_URI_PARAM_NAME}=${encodedOidcErrorRedirectUri}`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(() => expect(startMock).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(() => expect(nextMock).toHaveBeenCalled());
  });

  it('should call start with oidc idp with oidcResource flag and clear it from url', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    pageContent = '<span>It works!</span>';

    const oidcStateId = 'abcdefgh';
    const encodedOidcStateId = encodeURIComponent(oidcStateId);
    const oidcResource = 'https://api.example.com';
    const encodedOidcResource = encodeURIComponent(oidcResource);
    window.location.search = `?${OIDC_IDP_STATE_ID_PARAM_NAME}=${encodedOidcStateId}&${OIDC_RESOURCE_PARAM_NAME}=${encodedOidcResource}`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(startMock).toHaveBeenCalledWith(
          'sign-in',
          {
            ...defaultOptionsValues,
            oidcIdpStateId: 'abcdefgh',
            oidcResource: 'https://api.example.com',
          },
          undefined,
          '',
          '1.2.3',
          {
            otpSignInEmail: 1,
            'versioned-flow': 1,
          },
          {},
        ),
      { timeout: WAIT_TIMEOUT },
    );
    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(() => expect(window.location.search).toBe(''));
  });

  it('should call start with oidc idp with oidcResource when there is a start screen is configured', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    configContent = {
      flows: {
        'sign-in': { startScreenId: 'screen-0' },
      },
    };

    pageContent =
      '<descope-button>click</descope-button><span>It works!</span>';

    const oidcResource = 'https://api.example.com';
    const encodedOidcResource = encodeURIComponent(oidcResource);
    window.location.search = `?${OIDC_RESOURCE_PARAM_NAME}=${encodedOidcResource}`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(() => expect(startMock).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(() => expect(nextMock).toHaveBeenCalled());
  });

  it('Should call start with code and idpInitiated when idpInitiated condition is met in multiple conditions', async () => {
    window.location.search = `?${URL_CODE_PARAM_NAME}=code1`;
    configContent = {
      ...configContent,
      flows: {
        'sign-in': {
          conditions: [
            {
              key: 'idpInitiated',
              met: {
                interactionId: 'gbutpyzvtgs',
              },
              operator: 'not-empty',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
          ],
          version: 1,
        },
      },
    };

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;
    await waitFor(
      () =>
        expect(startMock).toHaveBeenCalledWith(
          'sign-in',
          defaultOptionsValues,
          undefined,
          '',
          '1.2.3',
          {
            'sign-in': 1,
          },
          {
            exchangeCode: 'code1',
            idpInitiated: true,
          },
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('Should call start with code and idpInitiated when idpInitiated condition is met in multiple conditions with last auth', async () => {
    window.location.search = `?${URL_CODE_PARAM_NAME}=code1`;
    configContent = {
      ...configContent,
      flows: {
        'sign-in': {
          conditions: [
            {
              key: 'idpInitiated',
              met: {
                interactionId: 'gbutpyzvtgs',
              },
              operator: 'not-empty',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
            {
              key: 'lastAuth.loginId',
              met: {
                interactionId: 'gbutpyzvtgs',
                screenId: 'met',
              },
              operator: 'not-empty',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
          ],
          version: 1,
        },
      },
    };

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;
    await waitFor(
      () =>
        expect(startMock).toHaveBeenCalledWith(
          'sign-in',
          defaultOptionsValues,
          undefined,
          '',
          '1.2.3',
          {
            'sign-in': 1,
          },
          {
            exchangeCode: 'code1',
            idpInitiated: true,
          },
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should call start with third party application stateId and clear it from url', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    pageContent = '<span>It works!</span>';
    configContent = {
      ...configContent,
      flows: {
        'sign-in': { version: 0 },
      },
    };
    const thirdPartyAppStateId = 'abcdefgh';
    const encodedThirdPartyAppStateId =
      encodeURIComponent(thirdPartyAppStateId);
    window.location.search = `?${THIRD_PARTY_APP_STATE_ID_PARAM_NAME}=${encodedThirdPartyAppStateId}`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(startMock).toHaveBeenCalledWith(
          'sign-in',
          {
            ...defaultOptionsValues,
            thirdPartyAppStateId: 'abcdefgh',
          },
          undefined,
          '',
          '1.2.3',
          {
            'sign-in': 0,
          },
          {},
        ),
      { timeout: WAIT_TIMEOUT },
    );
    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(() => expect(window.location.search).toBe(''));
  });

  it('should call start with application scopes info and clear it from url', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    pageContent = '<span>It works!</span>';
    configContent = {
      ...configContent,
      flows: {
        'sign-in': { version: 0 },
      },
    };
    const applicationScopes = 'openid profile email';
    const encodedApplicationScopes = encodeURIComponent(applicationScopes);
    window.location.search = `?${APPLICATION_SCOPES_PARAM_NAME}=${encodedApplicationScopes}`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(startMock).toHaveBeenCalledWith(
          'sign-in',
          {
            ...defaultOptionsValues,
            applicationScopes: 'openid profile email',
          },
          undefined,
          '',
          '1.2.3',
          {
            'sign-in': 0,
          },
          {},
        ),
      { timeout: WAIT_TIMEOUT },
    );
    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(() => expect(window.location.search).toBe(''));
  });

  it('Should fetch met screen when second condition is met (also checks conditions with predicates)', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    localStorage.setItem(
      DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
      '{"authMethod":"otp"}',
    );
    getLastUserLoginIdMock.mockReturnValue('abc');

    configContent = {
      ...configContent,
      flows: {
        'sign-in': {
          conditions: [
            {
              key: 'idpInitiated',
              met: {
                interactionId: 'gbutpyzvtgs',
              },
              operator: 'is-true',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
            {
              key: 'abTestingKey',
              met: {
                interactionId: 'gbutpyzvtgs',
                screenId: 'met',
              },
              operator: 'greater-than',
              predicate: 21,
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
          ],
        },
      },
    };

    pageContent = '<div>hey</div>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('hey'), {
      timeout: WAIT_TIMEOUT,
    });
    expect(startMock).not.toBeCalled();
    const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/met.html`;

    const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(htmlUrlPathRegex),
      expect.any(Object),
    );
  });
  it('Should fetch else screen when else is met', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    localStorage.setItem(
      DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
      '{"authMethod":"otp"}',
    );
    getLastUserLoginIdMock.mockReturnValue('');

    configContent = {
      ...configContent,
      flows: {
        'sign-in': {
          conditions: [
            {
              key: 'idpInitiated',
              met: {
                interactionId: 'gbutpyzvtgs',
              },
              operator: 'is-true',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
            {
              key: 'lastAuth.loginId',
              met: {
                interactionId: 'gbutpyzvtgs',
                screenId: 'met',
              },
              operator: 'not-empty',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
            {
              key: 'ELSE',
              met: {
                interactionId: '123123',
                screenId: 'else',
              },
            },
          ],
        },
      },
    };

    pageContent = '<div>hey</div>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('hey'), {
      timeout: WAIT_TIMEOUT,
    });
    expect(startMock).not.toBeCalled();
    const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/else.html`;

    const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(htmlUrlPathRegex),
      expect.any(Object),
    );
  });

  it('should call the success cb when flow in completed status', async () => {
    pageContent = '<input id="email" name="email"></input>';

    startMock.mockReturnValue(
      generateSdkResponse({
        ok: true,
        status: 'completed',
      }),
    );

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id=1></descope-wc>`;

    const wcEle = document.querySelector('descope-wc');

    const onSuccess = jest.fn();

    wcEle.addEventListener('success', onSuccess);

    await waitFor(
      () =>
        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({ detail: { refreshJwt: 'refreshJwt' } }),
        ),
      { timeout: WAIT_TIMEOUT },
    );

    wcEle.removeEventListener('success', onSuccess);
  });

  it('should not store last auth when use last authenticated user is false', async () => {
    localStorage.removeItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY);

    pageContent = '<input id="email" name="email"></input>';

    startMock.mockReturnValue(
      generateSdkResponse({
        ok: true,
        status: 'completed',
        lastAuth: { authMethod: 'otp' },
      }),
    );

    document.body.innerHTML = `<h1>Custom element test</h1>
      <descope-wc flow-id="otpSignInEmail" project-id=1 store-last-authenticated-user="false">
    </descope-wc>`;

    const wcEle = document.querySelector('descope-wc');

    const onSuccess = jest.fn();

    wcEle.addEventListener('success', onSuccess);

    await waitFor(
      () =>
        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({ detail: { refreshJwt: 'refreshJwt' } }),
        ),
      { timeout: WAIT_TIMEOUT },
    );

    expect(
      localStorage.getItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY),
    ).toBeNull();
  });

  it('should not store last auth when use last authenticated user is true', async () => {
    localStorage.removeItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY);

    pageContent = '<input id="email" name="email"></input>';

    startMock.mockReturnValue(
      generateSdkResponse({
        ok: true,
        status: 'completed',
        lastAuth: { authMethod: 'otp' },
      }),
    );

    document.body.innerHTML = `<h1>Custom element test</h1>
      <descope-wc flow-id="otpSignInEmail" project-id=1 store-last-authenticated-user="true">
    </descope-wc>`;

    const wcEle = document.querySelector('descope-wc');

    const onSuccess = jest.fn();

    wcEle.addEventListener('success', onSuccess);

    await waitFor(
      () =>
        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({ detail: { refreshJwt: 'refreshJwt' } }),
        ),
      { timeout: WAIT_TIMEOUT },
    );

    expect(localStorage.getItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY)).toEqual(
      `{"authMethod":"otp"}`,
    );
  });

  it('should store last auth when use last authenticated', async () => {
    localStorage.removeItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY);

    pageContent = '<input id="email" name="email"></input>';

    startMock.mockReturnValue(
      generateSdkResponse({
        ok: true,
        status: 'completed',
        lastAuth: { authMethod: 'otp', loginId: 'moshe' },
      }),
    );

    document.body.innerHTML = `<h1>Custom element test</h1>
      <descope-wc flow-id="otpSignInEmail" project-id=1>
    </descope-wc>`;

    const wcEle = document.querySelector('descope-wc');

    const onSuccess = jest.fn();

    wcEle.addEventListener('success', onSuccess);

    await waitFor(
      () =>
        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({ detail: { refreshJwt: 'refreshJwt' } }),
        ),
      { timeout: WAIT_TIMEOUT },
    );

    expect(localStorage.getItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY)).toEqual(
      `{"authMethod":"otp","loginId":"moshe"}`,
    );
  });

  it('should store last auth when use last authenticated not completed status with login id', async () => {
    localStorage.removeItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY);

    pageContent = '<div>hey</div>';

    startMock.mockReturnValue(
      generateSdkResponse({
        ok: true,
        status: 'waiting',
        lastAuth: { authMethod: 'otp', loginId: 'moshe' },
      }),
    );

    document.body.innerHTML = `<h1>Custom element test</h1>
      <descope-wc flow-id="otpSignInEmail" project-id=1>
    </descope-wc>`;

    await waitFor(() => screen.getByShadowText('hey'), {
      timeout: WAIT_TIMEOUT,
    });

    expect(localStorage.getItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY)).toEqual(
      `{"authMethod":"otp","loginId":"moshe"}`,
    );
  });

  it('should store last auth when use last authenticated not completed status and no login id', async () => {
    localStorage.removeItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY);

    pageContent = '<div>hey</div>';

    startMock.mockReturnValue(
      generateSdkResponse({
        ok: true,
        status: 'waiting',
        lastAuth: { authMethod: 'otp' },
      }),
    );

    document.body.innerHTML = `<h1>Custom element test</h1>
      <descope-wc flow-id="otpSignInEmail" project-id=1>
    </descope-wc>`;

    await waitFor(() => screen.getByShadowText('hey'), {
      timeout: WAIT_TIMEOUT,
    });

    expect(
      localStorage.getItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY),
    ).toBeNull();
  });

  it('should pass flow output into the on success event', async () => {
    pageContent = '<input id="email" name="email"></input>';

    startMock.mockReturnValue(
      generateSdkResponse({
        ok: true,
        status: 'completed',
        output: { customKey: 'customValue' },
      }),
    );

    document.body.innerHTML = `<h1>Custom element test</h1>
      <descope-wc flow-id="otpSignInEmail" project-id=1>
    </descope-wc>`;

    const wcEle = document.querySelector('descope-wc');

    const onSuccess = jest.fn();

    wcEle.addEventListener('success', onSuccess);

    await waitFor(
      () =>
        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: {
              refreshJwt: 'refreshJwt',
              flowOutput: { customKey: 'customValue' },
            },
          }),
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should update dynamic attribute values', async () => {
    pageContent = `<input ${HAS_DYNAMIC_VALUES_ATTR_NAME}="" testAttr="{{form.varName}}" id="email" name="email" placeholder="email"></input>`;

    startMock.mockReturnValue(
      generateSdkResponse({
        screenState: {
          form: { varName: 'varValue' },
        },
      }),
    );

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id=1></descope-wc>`;

    const inputEle = await waitFor(
      () => screen.getByShadowPlaceholderText('email'),
      {
        timeout: WAIT_TIMEOUT,
      },
    );

    await waitFor(
      () => expect(inputEle).toHaveAttribute('testAttr', 'varValue'),
      { timeout: WAIT_TIMEOUT },
    );
  });

  describe('locale', () => {
    it('should fetch the data from the correct path when locale provided without target locales', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      pageContent = '<input id="email"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail locale="en-us"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0.html`;
      const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/${THEME_DEFAULT_FILENAME}`;
      const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
      const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
      const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(themeUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(configUrlPathRegex),
        expect.any(Object),
      );
    });

    it(
      'should fetch the data from the correct path when locale provided with target locales',
      async () => {
        startMock.mockReturnValue(generateSdkResponse());

        configContent = {
          ...configContent,
          flows: {
            otpSignInEmail: {
              targetLocales: ['en-US'],
            },
          },
        };

        pageContent = '<input id="email"></input><span>It works!</span>';

        document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail" locale="en-Us"></descope-wc>`;

        await waitFor(() => screen.getByShadowText('It works!'), {
          timeout: WAIT_TIMEOUT,
        });

        const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0-en-us.html`;
        const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/${THEME_DEFAULT_FILENAME}`;
        const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

        const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
        const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
        const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringMatching(htmlUrlPathRegex),
          expect.any(Object),
        );

        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringMatching(themeUrlPathRegex),
          expect.any(Object),
        );

        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringMatching(configUrlPathRegex),
          expect.any(Object),
        );
      },
      WAIT_TIMEOUT,
    );

    it('should fetch the data from the correct path when locale provided and not part of target locales', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      configContent = {
        ...configContent,
        flows: {
          otpSignInEmail: {
            targetLocales: ['de'],
          },
        },
      };

      pageContent = '<input id="email"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail" locale="en-us"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0.html`;
      const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/${THEME_DEFAULT_FILENAME}`;
      const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
      const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
      const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(themeUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(configUrlPathRegex),
        expect.any(Object),
      );
    });

    it('should fetch the data from the correct path when locale provided in navigator', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      configContent = {
        ...configContent,
        flows: {
          otpSignInEmail: {
            targetLocales: ['en'],
          },
        },
      };

      Object.defineProperty(navigator, 'language', {
        value: 'en-Us',
        writable: true,
      });

      pageContent = '<input id="email"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0-en.html`;
      const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/${THEME_DEFAULT_FILENAME}`;
      const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
      const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
      const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(themeUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(configUrlPathRegex),
        expect.any(Object),
      );

      Object.defineProperty(navigator, 'language', {
        value: '',
        writable: true,
      });
    });

    it('should fetch the data from the correct path when zh-TW locale provided in navigator', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      configContent = {
        flows: {
          otpSignInEmail: {
            targetLocales: ['zh-TW'],
          },
        },
      };

      Object.defineProperty(navigator, 'language', {
        value: 'zh-TW',
        writable: true,
      });

      pageContent = '<input id="email"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0-zh-tw.html`;
      const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/${THEME_DEFAULT_FILENAME}`;
      const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
      const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
      const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(themeUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(configUrlPathRegex),
        expect.any(Object),
      );

      Object.defineProperty(navigator, 'language', {
        value: '',
        writable: true,
      });
    });

    it('should fetch the data from the correct path when locale provided in navigator short form', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      configContent = {
        ...configContent,
        flows: {
          otpSignInEmail: {
            targetLocales: ['en'],
          },
        },
      };

      Object.defineProperty(navigator, 'language', {
        value: 'en',
        writable: true,
      });

      pageContent = '<input id="email"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0-en.html`;
      const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/${THEME_DEFAULT_FILENAME}`;
      const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
      const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
      const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(themeUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(configUrlPathRegex),
        expect.any(Object),
      );

      Object.defineProperty(navigator, 'language', {
        value: '',
        writable: true,
      });
    });

    it('should fetch the data from the correct path when locale provided in navigator but not in target locales', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      configContent = {
        ...configContent,
        flows: {
          otpSignInEmail: {
            targetLocales: ['de'],
          },
        },
      };

      Object.defineProperty(navigator, 'language', {
        value: 'en-Us',
        writable: true,
      });

      pageContent = '<input id="email"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0.html`;
      const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/${THEME_DEFAULT_FILENAME}`;
      const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
      const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
      const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(themeUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(configUrlPathRegex),
        expect.any(Object),
      );

      Object.defineProperty(navigator, 'language', {
        value: '',
        writable: true,
      });
    });

    it('should fetch the data from the correct path when locale provided in navigator and request to locale fails', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      configContent = {
        ...configContent,
        flows: {
          otpSignInEmail: {
            targetLocales: ['en'],
          },
        },
      };

      const fn = fetchMock.getMockImplementation();
      fetchMock.mockImplementation((url: string) => {
        if (url.endsWith('en.html')) {
          return { ok: false };
        }
        return fn(url);
      });

      Object.defineProperty(navigator, 'language', {
        value: 'en-Us',
        writable: true,
      });

      pageContent = '<input id="email"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0-en.html`;
      const expectedHtmlFallbackPath = `/pages/1/${ASSETS_FOLDER}/0.html`;
      const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/${THEME_DEFAULT_FILENAME}`;
      const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
      const htmlUrlFallbackPathRegex = new RegExp(
        `//[^/]+${expectedHtmlFallbackPath}$`,
      );
      const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
      const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlFallbackPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(themeUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(configUrlPathRegex),
        expect.any(Object),
      );

      Object.defineProperty(navigator, 'language', {
        value: '',
        writable: true,
      });
    });
  });

  describe('Descope UI', () => {
    beforeEach(() => {
      BaseDescopeWc.descopeUI = undefined;
      jest.spyOn(document, 'createElement').mockImplementation((element) => {
        if (element.toLowerCase() === 'script') {
          return scriptMock;
        }
        return orginalCreateElement.apply(document, [element]);
      });
    });
    it('should log error if Descope UI cannot be loaded', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      pageContent = '<input id="email"></input><span>It works!</span>';

      globalThis.DescopeUI = undefined;

      const errorSpy = jest.spyOn(console, 'error');

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;
      await waitFor(
        () =>
          expect(
            document.querySelector(`script[id*="descope_web-components-ui"]`),
          ).toHaveAttribute('src', expect.stringContaining('https')),
        { timeout: WAIT_TIMEOUT },
      );

      document
        .querySelector('script[id*="descope_web-components-ui"]')
        .dispatchEvent(new Event('error'));

      await waitFor(
        () =>
          expect(errorSpy).toHaveBeenCalledWith(
            expect.stringContaining('Cannot load script from URL'),
          ),
        { timeout: WAIT_TIMEOUT },
      );
    });
    it('should try to load all descope component on the page', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      globalThis.DescopeUI = {
        'descope-button16': jest.fn(),
        'descope-input16': jest.fn(),
      };

      pageContent =
        '<descope-input16 id="email"></descope-input16><descope-button16>It works!</descope-button16>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(
        () =>
          Object.keys(globalThis.DescopeUI).forEach((key) =>
            expect(globalThis.DescopeUI[key]).toHaveBeenCalled(),
          ),
        { timeout: WAIT_TIMEOUT },
      );
    });
    it('should log an error if descope component is missing', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      pageContent =
        '<descope-button1 id="email"></descope-button1><span>It works!</span>';

      const errorSpy = jest.spyOn(console, 'error');

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(
        () =>
          expect(errorSpy).toHaveBeenCalledWith(
            'Cannot load UI component "descope-button1"',
            expect.any(String),
          ),
        { timeout: WAIT_TIMEOUT },
      );
    });

    it('should call the ready cb when page is loaded', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

      pageContent =
        '<span>First Page</span><descope-button>click</descope-button>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const ready = jest.fn();

      const wcEle = document.getElementsByTagName('descope-wc')[0];

      wcEle.addEventListener('ready', ready);

      await waitFor(() => screen.getByShadowText('First Page'), {
        timeout: WAIT_TIMEOUT,
      });

      // Should called after the page is loaded
      await waitFor(() => expect(ready).toBeCalledTimes(1), { timeout: 20000 });

      pageContent = '<span>Second Page</span>';

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(() => screen.getByShadowText('Second Page'), {
        timeout: WAIT_TIMEOUT,
      });

      // Should NOT be called again after the second page is updated
      expect(ready).toBeCalledTimes(1);

      wcEle.removeEventListener('ready', ready);
    });
  });

  it(
    'There are no multiple calls to submit',
    async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

      pageContent =
        '<descope-button id="submitterId">click</descope-button><input id="email" name="email"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      fireEvent.click(screen.getByShadowText('click'));
      fireEvent.keyDown(screen.getByShadowText('click'), {
        key: 'Enter',
        code: 'Enter',
        charCode: 13,
      });

      await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(1));
    },
    WAIT_TIMEOUT,
  );

  it('should call report validity on blur when validate-on-blur is set to true', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    pageContent = '<input name="email" id="email" placeholder="email"></input>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail" validate-on-blur="true"></descope-wc>`;

    const emailInput = await waitFor(
      () => screen.getByShadowPlaceholderText('email'),
      {
        timeout: WAIT_TIMEOUT,
      },
    );

    (<HTMLInputElement>emailInput).reportValidity = jest.fn();

    await waitFor(() => {
      fireEvent.blur(emailInput);

      expect(
        (<HTMLInputElement>emailInput).reportValidity,
      ).toHaveBeenCalledTimes(1);
    });
  });

  it('should not call report validity on blur by default', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    pageContent = '<input name="email" id="email" placeholder="email"></input>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

    const emailInput = await waitFor(
      () => screen.getByShadowPlaceholderText('email'),
      {
        timeout: WAIT_TIMEOUT,
      },
    );

    (<HTMLInputElement>emailInput).reportValidity = jest.fn();

    fireEvent.blur(emailInput);

    await waitFor(() =>
      expect(
        (<HTMLInputElement>emailInput).reportValidity,
      ).not.toHaveBeenCalled(),
    );
  });

  it('Multiple buttons with auto-submit true, correct button is being called upon enter', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    pageContent =
      '<descope-button id="submitterId" auto-submit="true" data-type="button">click</descope-button><descope-button id="submitterId2" data-type="button">click2</descope-button><input id="email" name="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const rootEle = document
      .getElementsByTagName('descope-wc')[0]
      .shadowRoot.querySelector('#root');

    fireEvent.keyDown(rootEle, { key: 'Enter', code: 13, charCode: 13 });

    await waitFor(() =>
      expect(nextMock).toHaveBeenCalledWith(
        '0',
        '0',
        'submitterId',
        1,
        '1.2.3',
        {
          email: '',
          origin: 'http://localhost',
        },
        false,
      ),
    );
  });

  describe('password managers', () => {
    it('should store password in password manager', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

      Object.assign(navigator, { credentials: { store: jest.fn() } });
      globalThis.PasswordCredential = class {
        constructor(obj) {
          Object.assign(this, obj);
        }
      };
      pageContent =
        '<descope-button id="submitterId">click</descope-button><input id="email" name="email" value="1@1.com"></input><input id="password" name="password" value="pass"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(
        () =>
          expect(navigator.credentials.store).toHaveBeenCalledWith({
            id: '1@1.com',
            password: 'pass',
          }),
        { timeout: WAIT_TIMEOUT },
      );
    });
  });

  describe('componentsConfig', () => {
    it('should parse componentsConfig values to screen components', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      nextMock.mockReturnValue(
        generateSdkResponse({
          screenState: {
            componentsConfig: { customComponent: { value: 'val1' } },
          },
        }),
      );

      pageContent = `<descope-button>click</descope-button><div>Loaded</div><input class="descope-input" name="customComponent">`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(() => screen.getByShadowDisplayValue('val1'), {
        timeout: WAIT_TIMEOUT,
      });
    });

    it('should parse componentsAttrs values to screen components after next', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      nextMock.mockReturnValue(
        generateSdkResponse({
          screenState: {
            componentsConfig: {
              componentsDynamicAttrs: {
                "[data-connector-id='id123']": {
                  attributes: {
                    'test-attr': 'test-value',
                    'test-attr2': 2,
                  },
                },
                "[id='id456']": {
                  attributes: {
                    'test-attr': 'test-value3',
                  },
                },
              },
            },
          },
        }),
      );

      pageContent = `<descope-button>click</descope-button><div>Loaded</div><input data-connector-id="id123" class="descope-input" placeholder="input1"></input><input id="id456" class="descope-input" placeholder="input2"></input>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(
        () =>
          expect(screen.getByShadowPlaceholderText('input1')).toHaveAttribute(
            'test-attr',
            'test-value',
          ),
        { timeout: WAIT_TIMEOUT },
      );
      expect(screen.getByShadowPlaceholderText('input1')).toHaveAttribute(
        'test-attr2',
        '2',
      );
      expect(screen.getByShadowPlaceholderText('input2')).toHaveAttribute(
        'test-attr',
        'test-value3',
      );
      expect(screen.getByShadowPlaceholderText('input2')).not.toHaveAttribute(
        'test-attr2',
      );
    });

    it('should parse componentsAttrs values to screen components after start', async () => {
      startMock.mockReturnValueOnce(
        generateSdkResponse({
          screenState: {
            componentsConfig: {
              componentsDynamicAttrs: {
                "[placeholder='input1']": {
                  attributes: {
                    'test-attr': 'test-value',
                  },
                },
              },
            },
          },
        }),
      );

      pageContent = `<descope-button>click</descope-button><div>Loaded</div><input class="descope-input" placeholder="input1"></input>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(
        () =>
          expect(screen.getByShadowPlaceholderText('input1')).toHaveAttribute(
            'test-attr',
            'test-value',
          ),
        { timeout: WAIT_TIMEOUT },
      );
    });

    it('should parse componentsAttrs values to screen components from config', async () => {
      configContent = {
        ...configContent,
        flows: {
          'sign-in': {
            startScreenId: 'screen-0',
            componentsConfig: {
              componentsDynamicAttrs: {
                "[id='id123']": {
                  attributes: {
                    'test-attr': 'test-value',
                  },
                },
              },
            },
          },
        },
      };
      pageContent = `<descope-button>click</descope-button><div>Loaded</div><input id="id123" class="descope-input" placeholder="input1"></input>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(
        () =>
          expect(screen.getByShadowPlaceholderText('input1')).toHaveAttribute(
            'test-attr',
            'test-value',
          ),
        { timeout: WAIT_TIMEOUT },
      );

      expect(startMock).not.toHaveBeenCalled();
      expect(nextMock).not.toHaveBeenCalled();
    });

    it('should parse componentsAttrs values to screen components from config with condition', async () => {
      configContent = {
        ...configContent,
        flows: {
          'sign-in': {
            conditions: [
              {
                key: 'idpInitiated',
                met: {
                  interactionId: 'vhz8zebfaw',
                  screenId: 'met',
                },
                operator: 'is-true',
                predicate: '',
              },
              {
                key: 'ELSE',
                met: {
                  componentsConfig: {
                    componentsDynamicAttrs: {
                      "[id='id123']": {
                        attributes: {
                          'test-attr': 'test-value',
                        },
                      },
                    },
                  },
                  interactionId: 'ELSE',
                  screenId: 'unmet',
                },
                unmet: {},
              },
            ],
          },
        },
      };

      pageContent = `<descope-button>click</descope-button><div>Loaded</div><input id="id123" class="descope-input" placeholder="input1"></input>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(
        () =>
          expect(screen.getByShadowPlaceholderText('input1')).toHaveAttribute(
            'test-attr',
            'test-value',
          ),
        { timeout: WAIT_TIMEOUT },
      );

      expect(startMock).not.toHaveBeenCalled();
    });
  });

  describe('cssVars', () => {
    it('should set css vars on root element', async () => {
      const spyGet = jest.spyOn(customElements, 'get');
      spyGet.mockReturnValue({ cssVarList: { varName: '--var-name' } } as any);

      startMock.mockReturnValueOnce(
        generateSdkResponse({
          screenState: {
            cssVars: { 'descope-button': { varName: 'value' } },
          },
        }),
      );

      pageContent = `<descope-button>click</descope-button><div>Loaded</div><input class="descope-input" name="customComponent">`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      const shadowEle =
        document.getElementsByTagName('descope-wc')[0].shadowRoot;
      const rootEle = shadowEle.querySelector('#content-root');

      await waitFor(
        () =>
          expect(rootEle).toHaveStyle({
            '--var-name': 'value',
          }),
        { timeout: 20000 },
      );
    });
  });

  describe('Input Flows', () => {
    it('should pre-populate input with flat structure config structure', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      pageContent = `<descope-button>click</descope-button><div>Loaded</div><input class="descope-input" name="kuku"/>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc form='{"kuku":"123"}' flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(() => screen.getByShadowDisplayValue('123'), {
        timeout: WAIT_TIMEOUT,
      });
    });

    it('should pre-populate input with nested config structure', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      pageContent = `<descope-button>click</descope-button><div>Loaded</div><input class="descope-input" name="kuku"/>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc form='{"kuku":{"value":"456"}}' flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(() => screen.getByShadowDisplayValue('456'), {
        timeout: WAIT_TIMEOUT,
      });
    });

    it('should disable pre-populated input', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      pageContent = `<descope-button>click</descope-button><div>Loaded</div><input class="descope-input" name="kuku"/>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc form='{"kuku":{"value":"123", "disabled":"true"}}' flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(
        () =>
          expect(screen.getByShadowDisplayValue('123')).toHaveAttribute(
            'disabled',
            'true',
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );
    });

    it('should pre-populate and disable input with combined nested/flat config structure', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      pageContent = `<descope-button>click</descope-button><div>Loaded</div><input class="descope-input" name="kuku"/><input class="descope-input" name="email"/>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc form='{"kuku":{"value":"456", "disabled":"true"}, "email": "my@email.com"}' flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(() => screen.getByShadowDisplayValue('456'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(
        () =>
          expect(screen.getByShadowDisplayValue('456')).toHaveAttribute(
            'disabled',
            'true',
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );
    });
  });

  it('should update page href attribute according to screen state', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({ screenState: { user: { name: 'john' } } }),
    );

    pageContent = `<div>Loaded123</div><descope-link class="descope-link" href="{{user.name}}">ho!</descope-link>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded123'), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(() =>
      expect(screen.getByShadowText('ho!')).toHaveAttribute('href', 'john'),
    );
  });

  it('should handle external input components', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    const clearPreviousExtInputsSpy = jest.spyOn(
      helpers,
      'clearPreviousExternalInputs',
    );

    pageContent =
      '<input id="should-be-removed" data-hidden-input="true"/><div external-input="true" id="email"><input slot="test-slot" type="email"/></div><span>It works!</span>';
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    // previous external input cleared
    await waitFor(() =>
      expect(clearPreviousExtInputsSpy).toHaveBeenCalledTimes(1),
    );

    const rootEle = document.getElementsByTagName('descope-wc')[0];

    // new external input created
    await waitFor(
      () =>
        expect(
          rootEle.querySelector('input[slot="input-email-test-slot"]'),
        ).toHaveAttribute('type', 'email'),
      { timeout: WAIT_TIMEOUT },
    );
  });

  describe('clientScripts', () => {
    beforeEach(() => {
      jest.spyOn(document, 'createElement').mockImplementation((element) => {
        if (element.toLowerCase() === 'script') {
          return scriptMock;
        }
        return orginalCreateElement.apply(document, [element]);
      });
      window.descope = { grecaptcha: mockClientScript };
    });
    it('should run client script from config.json', async () => {
      configContent = {
        flows: {
          'sign-in': {
            startScreenId: 'screen-0',
            clientScripts: [
              {
                id: 'grecaptcha',
                initArgs: {
                  enterprise: true,
                  siteKey: 'SITE_KEY',
                },
                resultKey: 'riskToken',
              },
            ],
          },
        },
      };
      pageContent =
        '<descope-button id="submitterId">click</descope-button><input id="email" name="email"></input><span>hey</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.findByShadowText('hey'), {
        timeout: WAIT_TIMEOUT,
      });
      scriptMock.onload();

      await waitFor(() =>
        expect(mockClientScript).toHaveBeenCalledWith(
          {
            enterprise: true,
            siteKey: 'SITE_KEY',
          },
          expect.any(Object),
          expect.any(Function),
          expect.any(Object),
        ),
      );
    });
    it('should run client script from client conditions', async () => {
      configContent = {
        ...configContent,
        flows: {
          'sign-in': {
            conditions: [
              {
                key: 'idpInitiated',
                met: {
                  interactionId: 'vhz8zebfaw',
                  screenId: 'recaptcha/SC2scMzI9OUnOEqJzEy3cg99U5f1t',
                },
                operator: 'is-true',
                predicate: '',
                unmet: {
                  clientScripts: [
                    {
                      id: 'grecaptcha',
                      initArgs: {
                        enterprise: true,
                        siteKey: 'SITE_KEY',
                      },
                      resultKey: 'riskToken',
                    },
                  ],
                  interactionId: 'ELSE',
                  screenId: 'recaptcha/SC2sJnbxyv3mFNePczbiDTL4AfuNN',
                },
              },
              {
                key: 'ELSE',
                met: {
                  clientScripts: [
                    {
                      id: 'grecaptcha',
                      initArgs: {
                        enterprise: true,
                        siteKey: 'SITE_KEY',
                      },
                      resultKey: 'riskToken',
                    },
                  ],
                  interactionId: 'ELSE',
                  screenId: 'recaptcha/SC2sJnbxyv3mFNePczbiDTL4AfuNN',
                },
                unmet: {},
              },
            ],
          },
        },
      };
      pageContent =
        '<descope-button id="submitterId">click</descope-button><input id="email" name="email"></input><span>hey</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.findByShadowText('hey'), {
        timeout: WAIT_TIMEOUT,
      });
      scriptMock.onload();

      await waitFor(() =>
        expect(mockClientScript).toHaveBeenCalledWith(
          {
            enterprise: true,
            siteKey: 'SITE_KEY',
          },
          expect.any(Object),
          expect.any(Function),
          expect.any(Object),
        ),
      );
    });
    describe('should run client script from sdk response', () => {
      beforeEach(async () => {
        mockPresentScript.mockClear();
        mockRefreshScript.mockClear();

        startMock.mockReturnValueOnce(
          generateSdkResponse({
            screenState: {
              clientScripts: [
                {
                  id: 'grecaptcha',
                  initArgs: {
                    enterprise: true,
                    siteKey: 'SITE_KEY',
                  },
                  resultKey: 'riskToken',
                },
              ],
            },
          }),
        );
        nextMock.mockReturnValueOnce(generateSdkResponse());

        pageContent =
          '<descope-button id="submitterId">click</descope-button><input id="email" name="email"></input><span>hey</span>';

        document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

        await waitFor(() => screen.findByShadowText('hey'), {
          timeout: WAIT_TIMEOUT,
        });

        scriptMock.onload();
        await waitFor(() =>
          expect(mockClientScript).toHaveBeenCalledWith(
            {
              enterprise: true,
              siteKey: 'SITE_KEY',
            },
            expect.any(Object),
            expect.any(Function),
            expect.any(Object),
          ),
        );
      });
      it('should run client script perform and refresh', async () => {
        mockPresentScript.mockResolvedValueOnce(true);

        fireEvent.click(screen.getByShadowText('click'));

        await waitFor(() => expect(mockPresentScript).toHaveBeenCalled(), {
          timeout: WAIT_TIMEOUT,
        });

        await waitFor(() => expect(mockRefreshScript).toHaveBeenCalled(), {
          timeout: WAIT_TIMEOUT,
        });

        await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
          timeout: WAIT_TIMEOUT,
        });
      });
    });
    it('should send the next request if timeout is reached', async () => {
      configContent = {
        ...configContent,
        flows: {
          'sign-in': {
            startScreenId: 'screen-0',
            clientScripts: [
              {
                id: 'grecaptcha',
                initArgs: {
                  enterprise: true,
                  siteKey: 'SITE_KEY',
                },
                resultKey: 'riskToken',
              },
            ],
          },
        },
      };
      pageContent =
        '<descope-button id="submitterId">click</descope-button><input id="email" name="email"></input><span>hey</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.findByShadowText('hey'), {
        timeout: WAIT_TIMEOUT,
      });

      scriptMock.onload();
      await waitFor(() =>
        expect(mockClientScript).toHaveBeenCalledWith(
          {
            enterprise: true,
            siteKey: 'SITE_KEY',
          },
          expect.any(Object),
          expect.any(Function),
          expect.any(Object),
        ),
      );

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(() => expect(startMock).not.toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });
      await waitFor(
        () =>
          expect(screen.getByShadowText('click')).toHaveAttribute(
            'loading',
            'true',
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      jest.advanceTimersByTime(SDK_SCRIPTS_LOAD_TIMEOUT + 1);

      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });
      await waitFor(
        () =>
          expect(screen.getByShadowText('click')).toHaveAttribute('loading'),
        {
          timeout: WAIT_TIMEOUT,
        },
      );
    });
  });

  describe('CSP', () => {
    it('should add nonce to window', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      pageContent = `<div>Loaded123</div><descope-link class="descope-link" href="{{user.name}}">ho!</descope-link>`;

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" nonce="123456"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded123'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(() => expect(window.DESCOPE_NONCE).toBe('123456'), {
        timeout: WAIT_TIMEOUT,
      });
    });
  });

  describe('custom screen', () => {
    it('should map sent inputs ', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      pageContent =
        '<descope-button>click</descope-button><input data-testid="inboundAppApproveScopes" name="inboundAppApproveScopes"></input><span>Loaded</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      const input = screen.getByShadowTestId('inboundAppApproveScopes');
      input.value = '1';

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(
        () =>
          expect(nextMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            null,
            expect.anything(),
            expect.anything(),
            expect.objectContaining({ thirdPartyAppApproveScopes: '1' }),
            false,
          ),
        { timeout: 30000 },
      );
    });

    it('should map onScreenUpdate inputs', async () => {
      startMock.mockReturnValue(
        generateSdkResponse({
          screenState: {
            user: { name: 'john' },
            inputs: {},
            cssVars: {},
            componentsConfig: {
              thirdPartyAppApproveScopes: {
                data: [{ a: 1 }],
              },
            },
            errorText: 'errorText',
            errorType: 'errorType',
            clientScripts: {},
            _key: {},
          },
        }),
      );

      pageContent = `<div>Loaded123</div><descope-link class="descope-link" href="{{user.name}}">ho!</descope-link>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc');
      const onScreenUpdate = jest.fn();
      descopeWc.onScreenUpdate = onScreenUpdate;

      await waitFor(() => screen.getByShadowText('Loaded123'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(() =>
        expect(onScreenUpdate).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ inboundAppApproveScopes: [{ a: 1 }] }),
          expect.any(Function),
          expect.any(HTMLElement),
        ),
      );
    });
    it('should call the onScreenUpdate with the correct params', async () => {
      startMock.mockReturnValue(
        generateSdkResponse({
          screenState: {
            user: { name: 'john' },
            inputs: {},
            cssVars: {},
            componentsConfig: {},
            errorText: 'errorText',
            errorType: 'errorType',
            clientScripts: {},
            _key: {},
          },
        }),
      );

      pageContent = `<div>Loaded123</div><descope-link class="descope-link" href="{{user.name}}">ho!</descope-link>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc');
      const onScreenUpdate = jest.fn();
      descopeWc.onScreenUpdate = onScreenUpdate;

      await waitFor(() => screen.getByShadowText('Loaded123'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(() => expect(onScreenUpdate).toHaveBeenCalledTimes(1));

      await waitFor(() =>
        expect(onScreenUpdate).toHaveBeenCalledWith(
          'Step Name',
          {
            form: {},
            lastAuth: { loginId: undefined, name: undefined },
            user: { name: 'john' },
            error: {
              text: 'errorText',
              type: 'errorType',
            },
            action: 'screen',
          },
          expect.any(Function),
          expect.any(HTMLElement),
        ),
      );
    });
    it('should render a flow screen when onScreenUpdate returns false', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      pageContent = `<div>Loaded123</div><descope-link class="descope-link" href="{{user.name}}">ho!</descope-link>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"><button>Custom Button</button></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc');
      const onScreenUpdate = jest.fn(() => false);
      descopeWc.onScreenUpdate = onScreenUpdate;

      await waitFor(() => expect(onScreenUpdate).toHaveBeenCalledTimes(1), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(() => screen.getByShadowText('Loaded123'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(
        () =>
          expect(descopeWc.shadowRoot.querySelector('slot')).toHaveClass(
            'hidden',
          ),
        {
          timeout: 20000,
        },
      );

      await waitFor(
        () =>
          expect(
            descopeWc.shadowRoot.querySelector('#content-root'),
          ).not.toHaveClass('hidden'),
        {
          timeout: 20000,
        },
      );
    });
    it('should render a flow screen when onScreenUpdate is not set', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      pageContent = `<div>Loaded123</div><descope-link class="descope-link" href="{{user.name}}">ho!</descope-link>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"><button>Custom Button</button></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc');

      await waitFor(() => screen.getByShadowText('Loaded123'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(
        () =>
          expect(descopeWc.shadowRoot.querySelector('slot')).toHaveClass(
            'hidden',
          ),
        {
          timeout: 20000,
        },
      );

      await waitFor(
        () =>
          expect(
            descopeWc.shadowRoot.querySelector('#content-root'),
          ).not.toHaveClass('hidden'),
        {
          timeout: 20000,
        },
      );
    });
    it('should render a custom screen when onScreenUpdate returns true', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      pageContent = `<div>Loaded123</div><descope-link class="descope-link" href="{{user.name}}">ho!</descope-link>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"><button>Custom Button</button></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc');
      const onScreenUpdate = jest.fn(() => true);
      descopeWc.onScreenUpdate = onScreenUpdate;

      await waitFor(() => expect(onScreenUpdate).toHaveBeenCalledTimes(1), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(
        () =>
          expect(screen.queryByShadowText('Loaded123')).not.toBeInTheDocument(),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      await waitFor(
        () =>
          expect(descopeWc.shadowRoot.querySelector('slot')).not.toHaveClass(
            'hidden',
          ),
        {
          timeout: 20000,
        },
      );

      await waitFor(
        () =>
          expect(
            descopeWc.shadowRoot.querySelector('#content-root'),
          ).toHaveClass('hidden'),
        {
          timeout: 20000,
        },
      );
    });
    it('should call onScreenUpdate after "next" call, even if there is no state change', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      nextMock.mockReturnValue(generateSdkResponse());

      pageContent = `<div>Loaded123</div><descope-link class="descope-link" href="{{user.name}}">ho!</descope-link>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"><button>Custom Button</button></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc');
      const onScreenUpdate = jest.fn(() => true);
      descopeWc.onScreenUpdate = onScreenUpdate;

      await waitFor(() => expect(onScreenUpdate).toHaveBeenCalledTimes(1), {
        timeout: WAIT_TIMEOUT,
      });

      const next = onScreenUpdate.mock.calls[0][2];

      next('bla', {});

      await waitFor(() => expect(onScreenUpdate).toHaveBeenCalledTimes(2), {
        timeout: 20000,
      });

      expect(onScreenUpdate.mock.calls[0][1]).toEqual(
        onScreenUpdate.mock.calls[1][1],
      );
    });
    it('should hide components when componentsState contains hide state', async () => {
      startMock.mockReturnValue(
        generateSdkResponse({
          screenState: {
            componentsState: {
              'test-button': 'hide',
              'test-input': 'hide',
            },
          },
        }),
      );

      pageContent = `<div>
        <descope-button id="test-button">Click me</descope-button>
        <input id="test-input" />
        <descope-text id="visible-text">Visible</descope-text>
      </div>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc');

      await waitFor(() => screen.getByShadowText('Visible'), {
        timeout: WAIT_TIMEOUT,
      });

      // Verify hidden components have the 'hidden' class
      const hiddenButton = descopeWc.shadowRoot.querySelector('#test-button');
      const hiddenInput = descopeWc.shadowRoot.querySelector('#test-input');
      const visibleText = descopeWc.shadowRoot.querySelector('#visible-text');

      expect(hiddenButton).toHaveClass('hidden');
      expect(hiddenInput).toHaveClass('hidden');
      expect(visibleText).not.toHaveClass('hidden');
    });

    it('should disable components when componentsState contains disable state', async () => {
      startMock.mockReturnValue(
        generateSdkResponse({
          screenState: {
            componentsState: {
              'test-submit-button': 'disable',
              'test-email-input': 'disable',
            },
          },
        }),
      );

      pageContent = `<div>
        <descope-button id="test-submit-button">Submit</descope-button>
        <input id="test-email-input" />
        <descope-button id="enabled-button">Enabled</descope-button>
      </div>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc');

      await waitFor(() => screen.getByShadowText('Submit'), {
        timeout: WAIT_TIMEOUT,
      });

      // Verify disabled components have the 'disabled' attribute
      const disabledButton = descopeWc.shadowRoot.querySelector(
        '#test-submit-button',
      );
      const disabledInput =
        descopeWc.shadowRoot.querySelector('#test-email-input');
      const enabledButton =
        descopeWc.shadowRoot.querySelector('#enabled-button');

      expect(disabledButton).toHaveAttribute('disabled', 'true');
      expect(disabledInput).toHaveAttribute('disabled', 'true');
      expect(enabledButton).toBeEnabled();
    });
    it('should handle empty componentsState gracefully', async () => {
      startMock.mockReturnValue(
        generateSdkResponse({
          screenState: {
            componentsState: {},
          },
        }),
      );

      pageContent = `<div>
        <descope-button id="btn-1">Button</descope-button>
        <input id="input-1" />
      </div>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc');

      await waitFor(() => screen.getByShadowText('Button'), {
        timeout: WAIT_TIMEOUT,
      });

      const btn = descopeWc.shadowRoot.querySelector('#btn-1');
      const input = descopeWc.shadowRoot.querySelector('#input-1');

      // Components should remain in their default state
      expect(btn).not.toHaveClass('hidden');
      expect(btn).toBeEnabled();
      expect(input).not.toHaveClass('hidden');
      expect(input).toBeEnabled();
    });

    it('should handle undefined componentsState gracefully', async () => {
      startMock.mockReturnValue(
        generateSdkResponse({
          screenState: {},
        }),
      );

      pageContent = `<div>
        <descope-button id="btn-1">Button</descope-button>
        <input id="input-1" />
      </div>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc');

      await waitFor(() => screen.getByShadowText('Button'), {
        timeout: WAIT_TIMEOUT,
      });

      const btn = descopeWc.shadowRoot.querySelector('#btn-1');
      const input = descopeWc.shadowRoot.querySelector('#input-1');

      // Components should remain in their default state
      expect(btn).not.toHaveClass('hidden');
      expect(btn).toBeEnabled();
      expect(input).not.toHaveClass('hidden');
      expect(input).toBeEnabled();
    });

    it('should allow lazy render when window attribute is set (for mobile)', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      window.descopeBridge = {};

      pageContent = `<div>Loaded123</div><descope-link class="descope-link" href="{{user.name}}">ho!</descope-link>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1" window="true"></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc');

      await waitFor(
        () => expect(descopeWc.lazyInit).toEqual(expect.any(Function)),
        { timeout: 20000 },
      );

      await waitFor(
        () =>
          expect(screen.queryByShadowText('Loaded123')).not.toBeInTheDocument(),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      descopeWc.lazyInit();

      await waitFor(
        () => expect(screen.queryByShadowText('Loaded123')).toBeInTheDocument(),
        {
          timeout: WAIT_TIMEOUT,
        },
      );
    });
  });
});
