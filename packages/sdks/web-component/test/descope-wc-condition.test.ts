/* eslint-disable max-classes-per-file */
// @ts-nocheck
import { createSdk } from '@descope/web-js-sdk';
import { fireEvent, waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { screen } from 'shadow-dom-testing-library';
import {
  ASSETS_FOLDER,
  DESCOPE_IDP_INITIATED_PARAM_NAME,
  DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
  OIDC_IDP_STATE_ID_PARAM_NAME,
  SAML_IDP_STATE_ID_PARAM_NAME,
  SAML_IDP_USERNAME_PARAM_NAME,
  SSO_APP_ID_PARAM_NAME,
  URL_CODE_PARAM_NAME,
  URL_REDIRECT_AUTH_BACKUP_CALLBACK_PARAM_NAME,
  URL_REDIRECT_AUTH_CALLBACK_PARAM_NAME,
  URL_REDIRECT_AUTH_CHALLENGE_PARAM_NAME,
  URL_REDIRECT_AUTH_INITIATOR_PARAM_NAME,
  URL_TOKEN_PARAM_NAME,
} from '../src/lib/constants';
import '../src/lib/descope-wc';
import { getABTestingKey } from '../src/lib/helpers/abTestingKey';
import { generateSdkResponse, invokeScriptOnload } from './testUtils';

global.CSSStyleSheet.prototype.replaceSync = jest.fn();

jest.mock('@descope/web-js-sdk', () => ({
  __esModule: true,
  default: jest.fn(),
  clearFingerprintData: jest.fn(),
  ensureFingerprintIds: jest.fn(),
}));

const WAIT_TIMEOUT = 25000;

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
const getLastUserLoginIdMock = sdk.getLastUserLoginId as jest.Mock;
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
const originalCreateElement = document.createElement;

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
      return originalCreateElement.apply(document, [element]);
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
});
