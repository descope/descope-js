import createSdk from '@descope/web-js-sdk';
import '@testing-library/jest-dom';
import { fireEvent, waitFor } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';
import { generateSdkResponse, invokeScriptOnload } from './testUtils';
import '../src/lib/descope-wc';

import { isConditionalLoginSupported } from '../src/lib/helpers/webauthn';
import { RESPONSE_ACTIONS } from '../src/lib/constants';

jest.mock('../src/lib/helpers/webauthn', () => ({
  isConditionalLoginSupported: jest.fn(),
  webAuthnCreate: jest.fn(),
}));

jest.mock('@descope/web-js-sdk', () => {
  const sdk = {
    flow: {
      start: jest.fn().mockName('flow.start'),
      next: jest.fn().mockName('flow.next'),
    },
    webauthn: {
      helpers: { isSupported: jest.fn(), conditional: jest.fn() },
      signIn: { start: jest.fn() },
    },
    getLastUserLoginId: jest.fn().mockName('getLastUserLoginId'),
    getLastUserDisplayName: jest.fn().mockName('getLastUserDisplayName'),
  };
  return () => sdk;
});

const sdk = createSdk({ projectId: '' });

const nextMock = sdk.flow.next as jest.Mock;
const startMock = sdk.flow.start as jest.Mock;
const isWebauthnSupportedMock = sdk.webauthn.helpers.isSupported as jest.Mock;
const webauthnConditionalMock = sdk.webauthn.helpers.conditional as jest.Mock;
const webauthnSignInStartMock = sdk.webauthn.signIn.start as jest.Mock;
const isConditionalLoginSupportedMock =
  isConditionalLoginSupported as jest.Mock;

globalThis.DescopeUI = {};

// this is for mocking the pages/theme/config
const themeContent = {};
let pageContent = '';
const configContent = {
  componentsVersion: '1.2.3',
};

const fetchMock: jest.Mock = jest.fn();
global.fetch = fetchMock;

Object.defineProperty(window, 'location', {
  value: new URL(window.location.origin),
});
window.location.assign = jest.fn();

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

describe('webauthnConditionalUi', () => {
  beforeEach(() => {
    jest.useFakeTimers();

    fetchMock.mockImplementation((url: string) => {
      const res = {
        ok: true,
        headers: new Headers({ h: '1' }),
      };

      switch (true) {
        case url.endsWith('theme.json'): {
          return { ...res, body: () => themeContent };
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

    webauthnConditionalMock.mockResolvedValueOnce('response');

    invokeScriptOnload();
  });

  afterEach(() => {
    document.getElementsByTagName('html')[0].innerHTML = '';
    jest.resetAllMocks();
    window.location.search = '';
  });

  it('should change the webauthn input name and add a "user-" prefix on load', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    isConditionalLoginSupportedMock.mockReturnValueOnce(true);
    isWebauthnSupportedMock.mockReturnValueOnce(true);
    webauthnSignInStartMock.mockResolvedValueOnce({
      ok: true,
      data: { options: 'options', transactionId: 'transactionId' },
    });
    pageContent =
      '<input name=test autocomplete="webauthn" placeholder="test"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowPlaceholderText('test'), {
      timeout: 3000,
    });

    await waitFor(
      () =>
        expect(screen.getByShadowPlaceholderText('test')).toHaveAttribute(
          'name',
          'user-test'
        ),
      { timeout: 3000 }
    );
  });

  it('should reset the webauthn input name when it has a value', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    isConditionalLoginSupportedMock.mockReturnValueOnce(true);
    isWebauthnSupportedMock.mockReturnValueOnce(true);
    webauthnSignInStartMock.mockResolvedValueOnce({
      ok: true,
      data: { options: 'options', transactionId: 'transactionId' },
    });
    pageContent =
      '<input name=test autocomplete="webauthn" placeholder="test"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    const input = await waitFor(
      () => screen.getByShadowPlaceholderText('test'),
      { timeout: 3000 }
    );

    await waitFor(() => expect(input).toHaveAttribute('name', 'user-test'), {
      timeout: 3000,
    });

    fireEvent.input(input, { target: { value: '1' } });

    await waitFor(() => expect(input).toHaveAttribute('name', 'test'));
  });

  it('should change the webauthn input name and add a "user-" prefix when it has no value', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    isConditionalLoginSupportedMock.mockReturnValueOnce(true);
    isWebauthnSupportedMock.mockReturnValueOnce(true);
    webauthnSignInStartMock.mockResolvedValueOnce({
      ok: true,
      data: { options: 'options', transactionId: 'transactionId' },
    });
    pageContent =
      '<input name=test autocomplete="webauthn" placeholder="test"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    const input = await waitFor(
      () => screen.getByShadowPlaceholderText('test'),
      { timeout: 3000 }
    );

    await waitFor(() => expect(input).toHaveAttribute('name', 'user-test'));

    fireEvent.input(input, { target: { value: '1' } });

    await waitFor(() => expect(input).toHaveAttribute('name', 'test'));

    fireEvent.input(input, { target: { value: '' } });

    await waitFor(() => expect(input).toHaveAttribute('name', 'user-test'));
  });

  it('should abort conditional ui session when clicking a biometrics button', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.webauthnCreate,
        webAuthnTransactionId: 't1',
        webAuthnOptions: 'options',
      })
    );
    isConditionalLoginSupportedMock.mockReturnValueOnce(true);
    isWebauthnSupportedMock.mockReturnValueOnce(true);
    webauthnSignInStartMock.mockResolvedValueOnce({
      ok: true,
      data: { options: 'options', transactionId: 'transactionId' },
    });

    const abort = jest.fn();
    Object.defineProperty(global, 'AbortController', {
      value: class {
        abort = abort;
      },
    });

    pageContent =
      '<button>click</button><input name=test autocomplete="webauthn" placeholder="test"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), { timeout: 3000 });

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(() => expect(abort).toHaveBeenCalled());
  });

  it('should not throw when webauthn start call fails', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.webauthnCreate,
        webAuthnTransactionId: 't1',
        webAuthnOptions: 'options',
      })
    );
    isConditionalLoginSupportedMock.mockReturnValueOnce(true);
    isWebauthnSupportedMock.mockReturnValueOnce(true);
    webauthnSignInStartMock.mockResolvedValueOnce({
      ok: false,
      data: { options: 'options', transactionId: 'transactionId' },
    });

    const errorSpy = jest.spyOn(console, 'error');

    pageContent =
      '<button>click</button><input name=test autocomplete="webauthn" placeholder="test"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith(
        'Webauthn start failed',
        '',
        expect.any(Error)
      )
    );
  });

  it('should call next with the correct params when user is logging in using autofill', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    isConditionalLoginSupportedMock.mockReturnValueOnce(true);
    isWebauthnSupportedMock.mockReturnValueOnce(true);

    webauthnSignInStartMock.mockResolvedValueOnce({
      ok: true,
      data: { options: 'options', transactionId: 'transactionId' },
    });
    pageContent =
      '<input id="id" name=test autocomplete="webauthn" placeholder="test"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(nextMock).toHaveBeenCalledWith('0', '0', 'id', {
          response: 'response',
          transactionId: 'transactionId',
        }),
      { timeout: 3000 }
    );
  });

  it('should add form element when browser is Chrome', async () => {
    const origUserAgent = navigator.userAgent;
    const origNavigatorVendor = navigator.vendor;

    Object.defineProperty(navigator, 'userAgent', {
      value: 'Chrome',
      writable: true,
    });
    Object.defineProperty(navigator, 'vendor', {
      value: 'Google Inc',
      writable: true,
    });

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() =>
      expect(document.querySelector('form')).toBeInTheDocument()
    );

    Object.defineProperty(navigator, 'userAgent', {
      value: origUserAgent,
      writable: true,
    });
    Object.defineProperty(navigator, 'vendor', { value: origNavigatorVendor });
  });
  it('should not add form element when browser is different from Chrome', async () => {
    const origUserAgent = navigator.userAgent;
    const origNavigatorVendor = navigator.vendor;

    Object.defineProperty(navigator, 'userAgent', {
      value: 'Test',
      writable: true,
    });
    Object.defineProperty(navigator, 'vendor', {
      value: 'Google Inc',
      writable: true,
    });

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() =>
      expect(document.querySelector('form')).not.toBeInTheDocument()
    );

    Object.defineProperty(navigator, 'userAgent', {
      value: origUserAgent,
      writable: true,
    });
    Object.defineProperty(navigator, 'vendor', { value: origNavigatorVendor });
  });
  it('should not add form element when WC is wrapped with a form element', async () => {
    Object.defineProperty(navigator, 'userAgent', { value: 'Chrome' });
    Object.defineProperty(navigator, 'vendor', { value: 'Google Inc' });

    document.body.innerHTML = `<form><h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc></form>`;

    await waitFor(() =>
      expect(document.querySelectorAll('form').length).toBe(1)
    );
  });
});
