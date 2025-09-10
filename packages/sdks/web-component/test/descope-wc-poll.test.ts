/* eslint-disable max-classes-per-file */
// @ts-nocheck
import createSdk from '@descope/web-js-sdk';
import { fireEvent, waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { screen } from 'shadow-dom-testing-library';
import { CUSTOM_INTERACTIONS, RESPONSE_ACTIONS } from '../src/lib/constants';
import '../src/lib/descope-wc';
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
      jest.spyOn(global, 'setTimeout');

      startMock.mockReturnValueOnce(generateSdkResponse());

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
            expect.objectContaining({ detail: 'auth info' }),
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
});
