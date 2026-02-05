/* eslint-disable max-classes-per-file */
// @ts-nocheck
import { createSdk } from '@descope/web-js-sdk';
import { waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { screen } from 'shadow-dom-testing-library';
import { DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY } from '../src/lib/constants';
import '../src/lib/descope-wc';
// eslint-disable-next-line import/no-namespace
import * as helpers from '../src/lib/helpers/helpers';
import { generateSdkResponse, invokeScriptOnload } from './testUtils';
import { getABTestingKey } from '../src/lib/helpers/abTestingKey';
import { resetCustomStorage } from '../src/lib/helpers/storage';

global.CSSStyleSheet.prototype.replaceSync = jest.fn();

jest.mock('@descope/web-js-sdk', () => ({
  __esModule: true,
  createSdk: jest.fn(),
  clearFingerprintData: jest.fn(),
  ensureFingerprintIds: jest.fn(),
}));

const WAIT_TIMEOUT = 25000;

const abTestingKey = getABTestingKey();

const defaultOptionsValues = {
  baseUrl: '',
  deferredRedirect: false,
  deferredPolling: false,
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

const startMock = sdk.flow.start as jest.Mock;

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

const scriptMock = Object.assign(document.createElement('script'), {
  setAttribute: jest.fn(),
  addEventListener: jest.fn(),
  onload: jest.fn(),
  onerror: jest.fn(),
});

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

    jest.spyOn(Math, 'random').mockReturnValue(0.215);

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
    document.getElementsByTagName('head')[0].innerHTML = '';
    document.getElementsByTagName('body')[0].innerHTML = '';
    document.body.append = origAppend;
    jest.resetAllMocks();
    window.location.search = '';
    themeContent = {};
    pageContent = '';
    localStorage.removeItem('dls_ab_testing_id');
    localStorage.removeItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY);
    resetCustomStorage();
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

    await waitFor(() =>
      expect(clearPreviousExtInputsSpy).toHaveBeenCalledTimes(1),
    );

    const rootEle = document.getElementsByTagName('descope-wc')[0];

    await waitFor(
      () =>
        expect(
          rootEle.querySelector('input[slot="input-email-test-slot"]'),
        ).toHaveAttribute('type', 'email'),
      { timeout: WAIT_TIMEOUT },
    );
  });
});
