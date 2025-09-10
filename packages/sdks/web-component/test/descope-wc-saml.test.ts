/* eslint-disable max-classes-per-file */
// @ts-nocheck
import createSdk from '@descope/web-js-sdk';
import { waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { screen } from 'shadow-dom-testing-library';
import {
  RESPONSE_ACTIONS,
  SAML_IDP_USERNAME_PARAM_NAME,
} from '../src/lib/constants';
import '../src/lib/descope-wc';
// eslint-disable-next-line import/no-namespace
import * as helpers from '../src/lib/helpers/helpers';
// eslint-disable-next-line import/no-namespace
import { generateSdkResponse, invokeScriptOnload } from './testUtils';

global.CSSStyleSheet.prototype.replaceSync = jest.fn();

jest.mock('@descope/web-js-sdk', () => ({
  __esModule: true,
  default: jest.fn(),
  clearFingerprintData: jest.fn(),
  ensureFingerprintIds: jest.fn(),
}));

const WAIT_TIMEOUT = 25000;

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
const orginalCreateElement = document.createElement;

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
});
