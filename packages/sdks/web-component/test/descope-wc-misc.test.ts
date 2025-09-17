/* eslint-disable max-classes-per-file */
// @ts-nocheck
import { createSdk } from '@descope/web-js-sdk';
import { fireEvent, waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { screen } from 'shadow-dom-testing-library';
import {
  ASSETS_FOLDER,
  CONFIG_FILENAME,
  CUSTOM_INTERACTIONS,
  RESPONSE_ACTIONS,
  SDK_SCRIPTS_LOAD_TIMEOUT,
} from '../src/lib/constants';
import '../src/lib/descope-wc';
import BaseDescopeWc from '../src/lib/descope-wc/BaseDescopeWc';
import { generateSdkResponse, invokeScriptOnload } from './testUtils';

global.CSSStyleSheet.prototype.replaceSync = jest.fn();

jest.mock('@descope/web-js-sdk', () => ({
  __esModule: true,
  default: jest.fn(),
  clearFingerprintData: jest.fn(),
  ensureFingerprintIds: jest.fn(),
}));

const WAIT_TIMEOUT = 25000;
const THEME_DEFAULT_FILENAME = `theme.json`;

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
            expect.objectContaining({ detail: 'auth info' }),
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
            expect.objectContaining({ detail: 'auth info' }),
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
            expect.objectContaining({ detail: 'auth info' }),
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
        return originalCreateElement.apply(document, [element]);
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

  describe('clientScripts', () => {
    beforeEach(() => {
      jest.spyOn(document, 'createElement').mockImplementation((element) => {
        if (element.toLowerCase() === 'script') {
          return scriptMock;
        }
        return originalCreateElement.apply(document, [element]);
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
        ),
      );
    });
    it('should run client script from sdk response', async () => {
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
        ),
      );
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
