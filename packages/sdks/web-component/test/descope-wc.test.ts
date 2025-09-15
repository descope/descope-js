/* eslint-disable max-classes-per-file */
// @ts-nocheck
import createSdk, { ensureFingerprintIds } from '@descope/web-js-sdk';
import { fireEvent, waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { screen } from 'shadow-dom-testing-library';
import {
  APPLICATION_SCOPES_PARAM_NAME,
  ASSETS_FOLDER,
  CONFIG_FILENAME,
  DESCOPE_ATTRIBUTE_PREFIX,
  DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
  ELEMENT_TYPE_ATTRIBUTE,
  FLOW_TIMED_OUT_ERROR_CODE,
  HAS_DYNAMIC_VALUES_ATTR_NAME,
  OIDC_ERROR_REDIRECT_URI_PARAM_NAME,
  OIDC_IDP_STATE_ID_PARAM_NAME,
  OIDC_LOGIN_HINT_PARAM_NAME,
  OIDC_PROMPT_PARAM_NAME,
  OIDC_RESOURCE_PARAM_NAME,
  RESPONSE_ACTIONS,
  SDK_SCRIPT_RESULTS_KEY,
  THIRD_PARTY_APP_STATE_ID_PARAM_NAME,
  URL_CODE_PARAM_NAME,
  URL_ERR_PARAM_NAME,
  URL_REDIRECT_AUTH_INITIATOR_PARAM_NAME,
  URL_RUN_IDS_PARAM_NAME,
  URL_TOKEN_PARAM_NAME,
} from '../src/lib/constants';
import '../src/lib/descope-wc';
// eslint-disable-next-line import/no-namespace
import * as helpers from '../src/lib/helpers/helpers';
// eslint-disable-next-line import/no-namespace
import { getABTestingKey } from '../src/lib/helpers/abTestingKey';
import { generateSdkResponse, invokeScriptOnload } from './testUtils';

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
const mockClientScript = jest.fn(() => ({
  start: mockStartScript,
  stop: mockStopScript,
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
    jest.resetAllMocks();
    window.location.search = '';
    themeContent = {};
    pageContent = '';
  });

  describe('Polling & Long-Running Actions', () => {
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
  });

  describe('Loading State & UI Restoration', () => {
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
          expect(screen.getByShadowText('Submit')).not.toHaveAttribute(
            'loading',
          );
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
  });

  describe('Theme Switching Runtime', () => {
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
          expect(DescopeUI.componentsThemeManager.currentThemeName).toBe(
            'dark',
          ),
        { timeout: 3000 },
      );
      await waitFor(
        () => expect(rootEle).toHaveAttribute('data-theme', 'dark'),
        {
          timeout: 3000,
        },
      );
    }, 5000);
  });

  describe('Query Parameter Cleanup', () => {
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
  });

  describe('Initial Rendering & Error Recovery', () => {
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
  });

  describe('Theme Injection on Load', () => {
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
          expect(
            global.CSSStyleSheet.prototype.replaceSync,
          ).toHaveBeenCalledWith(
            (themeContent as any).light.globals +
              (themeContent as any).dark.globals,
          ),
        { timeout: WAIT_TIMEOUT },
      );
    });
  });

  describe('Auto Focus Behavior', () => {
    it('Auto focus input by default', async () => {
      startMock.mockReturnValue(generateSdkResponse());
      const autoFocusSpy = jest.spyOn(helpers, 'handleAutoFocus');
      pageContent = '<input id="email"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(() =>
        expect(autoFocusSpy).toBeCalledWith(
          expect.any(HTMLElement),
          true,
          true,
        ),
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
        expect(autoFocusSpy).toBeCalledWith(
          expect.any(HTMLElement),
          false,
          true,
        ),
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
  });

  describe('Asset & Config Fetching Paths', () => {
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
  });

  describe('Prop Changes & Basic Submission Flow', () => {
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
        ),
      );
    });
  });

  describe('Component Registration & Keyboard Submission Logic', () => {
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

      customElements.define(
        'descope-test-button',
        class extends HTMLElement {},
      );

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
  });

  describe('Screen State Synchronization & Data Binding', () => {
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
          expect(nextMock).toHaveBeenCalledWith('0', '0', null, 1, '1.2.3', {
            image: '',
            origin: 'http://localhost',
          }),
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
        generateSdkResponse({
          screenState: { totp: { image: 'base-64-text' } },
        }),
      );

      const spyGet = jest.spyOn(customElements, 'get');
      spyGet.mockReturnValueOnce({ cssVarList: { url: '--url' } } as any);

      pageContent = `<div>Loaded1</div>`;

      document.body.innerHTML = `<h1>Custom element test</h1><descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded1'), {
        timeout: WAIT_TIMEOUT,
      });

      const shadowEle =
        document.getElementsByTagName('descope-wc')[0].shadowRoot;

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
          expect(logSpy).toHaveBeenCalledWith(
            'No screen was found to show',
            '',
          ),
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

      const shadowEle =
        document.getElementsByTagName('descope-wc')[0].shadowRoot;
      const rootEle = shadowEle.querySelector('#content-root');
      const spyAddEventListener = jest.spyOn(rootEle, 'addEventListener');

      spyAddEventListener.mockImplementation(
        (_, cb) => typeof cb === 'function' && cb({} as Event),
      );

      await waitFor(() => screen.findByShadowText('It updated!'), {
        timeout: 20000,
      });
    });
  });

  describe('URL Token & Exchange Parameter Handling', () => {
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
          expect(nextMock).toHaveBeenCalledWith(
            '0',
            '0',
            'submit',
            1,
            '1.2.3',
            {
              token: 'token1',
            },
          ),
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
          expect(nextMock).toHaveBeenCalledWith(
            '0',
            '0',
            'submit',
            0,
            '1.2.3',
            {
              exchangeCode: 'code1',
            },
          ),
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
          expect(nextMock).toHaveBeenCalledWith(
            '0',
            '0',
            'submit',
            1,
            '1.2.3',
            {
              exchangeError: 'err1',
            },
          ),
        { timeout: WAIT_TIMEOUT },
      );
      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });
    });
  });

  describe('Attribute Collection & Submitter Loading Indicator', () => {
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
        expect(nextMock).toBeCalledWith('0', '0', '123', 1, '1.2.3', {
          attr1: 'attr1',
          attr2: 'attr2',
          origin: 'http://localhost',
        }),
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
        () =>
          expect(screen.getByShadowText('Click')).not.toHaveClass('loading'),
        { timeout: WAIT_TIMEOUT },
      );
    });
  });

  describe('Redirect & Navigation Actions', () => {
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
        () =>
          expect(window.location.assign).toHaveBeenCalledWith(
            'https://myurl.com',
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );
    });

    it('When action type is "redirect" it calls location.assign one time only', async () => {
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
  });

  describe('WebAuthn Action Handling', () => {
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
  });

  describe('Config Resources & Flow Startup Enhancements', () => {
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
  });

  describe('Theme Selection Defaults', () => {
    it('it should set the theme based on the user parameter', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1" theme="light"></descope-wc>`;

      const shadowEle =
        document.getElementsByTagName('descope-wc')[0].shadowRoot;

      const rootEle = shadowEle?.querySelector('#root');

      await waitFor(() =>
        expect(rootEle).toHaveAttribute('data-theme', 'light'),
      );
    });

    it('it should set the theme based on OS settings when theme is "os"', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      window.matchMedia = jest.fn(() => ({ matches: true })) as any;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1" theme="os"></descope-wc>`;

      const shadowEle =
        document.getElementsByTagName('descope-wc')[0].shadowRoot;

      const rootEle = shadowEle?.querySelector('#root');

      await waitFor(() =>
        expect(rootEle).toHaveAttribute('data-theme', 'dark'),
      );
    });

    it('it should set the theme to light if not provided', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      window.matchMedia = jest.fn(() => ({ matches: true })) as any;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const shadowEle =
        document.getElementsByTagName('descope-wc')[0].shadowRoot;

      const rootEle = shadowEle?.querySelector('#root');

      await waitFor(() =>
        expect(rootEle).toHaveAttribute('data-theme', 'light'),
      );
    });
  });

  describe('Form Validation Errors', () => {
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
  });

  describe('Flow Start Options & Conditional Screens', () => {
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
                predicate: abTestingKey - 1,
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
            expect.objectContaining({ detail: 'auth info' }),
          ),
        { timeout: WAIT_TIMEOUT },
      );

      wcEle.removeEventListener('success', onSuccess);
    });
  });

  describe('Last Auth Persistence', () => {
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
            expect.objectContaining({ detail: 'auth info' }),
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
            expect.objectContaining({ detail: 'auth info' }),
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
            expect.objectContaining({ detail: 'auth info' }),
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
  });

  describe('Dynamic Attributes & Submit Concurrency Control', () => {
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
  });

  describe('Form Validation Blur Behavior', () => {
    it('should call report validity on blur when validate-on-blur is set to true', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      pageContent =
        '<input name="email" id="email" placeholder="email"></input>';

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

      pageContent =
        '<input name="email" id="email" placeholder="email"></input>';

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
  });

  describe('Multi-Button Auto Submit & External Integrations', () => {
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
        ),
      );
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
  });
});
