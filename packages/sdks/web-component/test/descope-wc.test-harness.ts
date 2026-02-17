/* eslint-disable max-classes-per-file */
// @ts-nocheck

import { createSdk, ensureFingerprintIds } from '@descope/web-js-sdk';
import '@testing-library/jest-dom';
import { getABTestingKey } from '../src/lib/helpers/abTestingKey';
import { resetCustomStorage } from '../src/lib/helpers/storage';
import { DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY } from '../src/lib/constants';
import { generateSdkResponse, invokeScriptOnload } from './testUtils';

global.CSSStyleSheet.prototype.replaceSync = jest.fn();

jest.mock('@descope/web-js-sdk', () => ({
  __esModule: true,
  createSdk: jest.fn(),
  clearFingerprintData: jest.fn(),
  ensureFingerprintIds: jest.fn(),
}));

export { createSdk, ensureFingerprintIds };

export const WAIT_TIMEOUT = 25000;

export const defaultOptionsValues = {
  baseUrl: '',
  deferredRedirect: false,
  deferredPolling: false,
  abTestingKey: getABTestingKey(),
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

export class MockFileReader {
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

export const sdk = {
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

export const nextMock = sdk.flow.next as jest.Mock;
export const startMock = sdk.flow.start as jest.Mock;
export const isWebauthnSupportedMock = sdk.webauthn.helpers
  .isSupported as jest.Mock;
export const getLastUserLoginIdMock = sdk.getLastUserLoginId as jest.Mock;
export const getLastUserDisplayNameMock =
  sdk.getLastUserDisplayName as jest.Mock;

export const fixtures = {
  themeContent: {},
  pageContent: '',
  configContent: {} as any,
};

class TestClass {}

export const fetchMock: jest.Mock = jest.fn();
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

if (!customElements.get('descope-button')) {
  customElements.define('descope-button', DescopeButton);
}

export const origAppend = document.body.append;
export const orginalCreateElement = document.createElement;

export const mockStartScript = jest.fn();
export const mockStopScript = jest.fn();
export const mockRefreshScript = jest.fn();
export const mockPresentScript = jest.fn();
export const mockClientScript = jest.fn(() => ({
  id: 'grecaptcha',
  start: mockStartScript,
  stop: mockStopScript,
  refresh: mockRefreshScript,
  present: mockPresentScript,
}));

export const scriptMock = Object.assign(document.createElement('script'), {
  setAttribute: jest.fn(),
  addEventListener: jest.fn(),
  onload: jest.fn(),
  onerror: jest.fn(),
});

export function setupWebComponentTestEnv() {
  fixtures.configContent = {
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
        return { ...res, json: () => fixtures.themeContent };
      }
      case url.endsWith('.html'): {
        return { ...res, text: () => fixtures.pageContent };
      }
      case url.endsWith('config.json'): {
        return { ...res, json: () => fixtures.configContent };
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
}

export function teardownWebComponentTestEnv() {
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
  fixtures.themeContent = {};
  fixtures.pageContent = '';
  localStorage.removeItem('dls_ab_testing_id');
  localStorage.removeItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY);
  resetCustomStorage();
}

export function resetHarnessFixtureContent() {
  fixtures.themeContent = {};
  fixtures.pageContent = '';
  fixtures.configContent = {};
}

export { generateSdkResponse, invokeScriptOnload };
