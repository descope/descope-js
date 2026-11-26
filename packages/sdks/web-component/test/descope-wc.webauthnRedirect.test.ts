/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  nextMock,
  fixtures,
  sdk,
  generateSdkResponse,
  WAIT_TIMEOUT,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

import {
  RESPONSE_ACTIONS,
  URL_RUN_IDS_PARAM_NAME,
  URL_CODE_PARAM_NAME,
} from '../src/lib/constants';
import { clearSsoContextOnAppRedirect } from '../src/lib/helpers/oidcSession';

jest.mock('../src/lib/helpers/oidcSession', () => ({
  ...jest.requireActual('../src/lib/helpers/oidcSession'),
  clearSsoContextOnAppRedirect: jest.fn(),
}));

describe('web-component webauthn', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
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
          '[Descope]',
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
    fixtures.pageContent = '<span>It works!</span>';

    nextMock.mockReturnValueOnce(generateSdkResponse());

    sdk.webauthn.helpers.create.mockReturnValueOnce(
      Promise.resolve('webauthn-response'),
    );

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="webauthn_signup" project-id="1"></descope-wc>`;

    await waitFor(
      () => expect(sdk.webauthn.helpers.create).toHaveBeenCalled(),
      { timeout: WAIT_TIMEOUT },
    );
    // the reply goes out a tick after the browser call settles
    await waitFor(
      () =>
        expect(nextMock).toHaveBeenCalledWith('0', '0', 'submit', 0, '1.2.3', {
          transactionId: 't1',
          response: 'webauthn-response',
        }),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('Should search of existing credentials when action type is "webauthnGet"', async () => {
    startMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.webauthnGet,
        webAuthnTransactionId: 't1',
        webAuthnOptions: 'options',
      }),
    );

    fixtures.pageContent = '<span>It works!</span>';

    nextMock.mockReturnValueOnce(generateSdkResponse());

    sdk.webauthn.helpers.get.mockReturnValueOnce(
      Promise.resolve('webauthn-response-get'),
    );

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    await waitFor(() => expect(sdk.webauthn.helpers.get).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(
      () =>
        expect(nextMock).toHaveBeenCalledWith('0', '0', 'submit', 1, '1.2.3', {
          transactionId: 't1',
          response: 'webauthn-response-get',
        }),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('Should handle canceling webauthn', async () => {
    startMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.webauthnGet,
        webAuthnTransactionId: 't1',
        webAuthnOptions: 'options',
      }),
    );

    fixtures.pageContent = '<span>It works!</span>';

    nextMock.mockReturnValueOnce(generateSdkResponse());

    const error = new DOMException(
      'The operation either timed out or was not allowed.',
      'NotAllowedError',
    );
    error.reason = 'not_allowed';
    sdk.webauthn.helpers.get.mockReturnValueOnce(Promise.reject(error));

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="webauthn_signup" project-id="1"></descope-wc>`;

    await waitFor(() => expect(sdk.webauthn.helpers.get).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(
      () =>
        expect(nextMock).toHaveBeenCalledWith('0', '0', 'submit', 0, '1.2.3', {
          transactionId: 't1',
          failure: 'NotAllowedError',
          failureReason: 'not_allowed',
          failureMessage: 'The operation either timed out or was not allowed.',
        }),
      { timeout: WAIT_TIMEOUT },
    );
  });
});

describe('web-component redirect', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  it('When action type is "redirect" it navigates to the same-origin "redirectUrl" from the server', async () => {
    nextMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.redirect,
        redirectUrl: '/welcome?code=123',
      }),
    );

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_0&${URL_CODE_PARAM_NAME}=code1`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(window.location.assign).toHaveBeenCalledWith(
          '/welcome?code=123',
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it.each([
    // eslint-disable-next-line no-script-url
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'http://user@localhost/steal',
    'http://[invalid',
  ])('blocks unsafe server redirect %s', async (redirectUrl) => {
    startMock.mockReturnValueOnce(
      generateSdkResponse({ action: RESPONSE_ACTIONS.redirect, redirectUrl }),
    );
    const errorSpy = jest.spyOn(console, 'error');
    document.body.innerHTML = `<descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(errorSpy).toHaveBeenCalledWith(
          '[Descope]',
          expect.stringContaining('Blocked'),
          '',
          expect.any(Error),
        ),
      { timeout: WAIT_TIMEOUT },
    );
    expect(window.location.assign).not.toHaveBeenCalled();
    expect(clearSsoContextOnAppRedirect).not.toHaveBeenCalled();
  });

  it('follows a cross-origin server redirect when no allowlist is set', async () => {
    startMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.redirect,
        redirectUrl: 'https://accounts.example/authorize',
      }),
    );
    document.body.innerHTML = `<descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(window.location.assign).toHaveBeenCalledWith(
          'https://accounts.example/authorize',
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it.each([
    '//evil.example/steal',
    'https://evil.example/steal',
    'https://localhost.evil.example/steal',
    'http://evil.example\\@localhost/steal',
  ])(
    'blocks %s and keeps SSO context when an allowlist is set',
    async (redirectUrl) => {
      startMock.mockReturnValueOnce(
        generateSdkResponse({ action: RESPONSE_ACTIONS.redirect, redirectUrl }),
      );
      const errorSpy = jest.spyOn(console, 'error');
      document.body.innerHTML = `<descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;
      document.querySelector('descope-wc').allowedRedirectOrigins = [
        'https://accounts.example',
      ];

      await waitFor(
        () =>
          expect(errorSpy).toHaveBeenCalledWith(
            '[Descope]',
            'Blocked redirect to untrusted origin',
            '',
            expect.any(Error),
          ),
        { timeout: WAIT_TIMEOUT },
      );
      expect(window.location.assign).not.toHaveBeenCalled();
      expect(clearSsoContextOnAppRedirect).not.toHaveBeenCalled();
    },
  );

  it('clears SSO context when a server redirect is allowed', async () => {
    startMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.redirect,
        redirectUrl: '/welcome?code=123',
      }),
    );
    document.body.innerHTML = `<descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(clearSsoContextOnAppRedirect).toHaveBeenCalledWith(
          '/welcome?code=123',
          expect.anything(),
          expect.anything(),
          '1',
          'versioned-flow',
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('permits a configured redirect-url origin for the app callback', async () => {
    document.body.innerHTML = `<descope-wc flow-id="versioned-flow" project-id="1" redirect-url="https://app.example/callback"></descope-wc>`;
    document.querySelector('descope-wc').allowedRedirectOrigins = [
      'https://accounts.example',
    ];
    document
      .querySelector('descope-wc')
      .handleRedirect('https://app.example/callback?code=123');

    await waitFor(() =>
      expect(window.location.assign).toHaveBeenCalledWith(
        'https://app.example/callback?code=123',
      ),
    );
  });

  it('permits an explicitly allowed OAuth provider origin', async () => {
    document.body.innerHTML = `<descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;
    const wc = document.querySelector('descope-wc');
    wc.allowedRedirectOrigins = ['https://accounts.example'];
    wc.handleRedirect('https://accounts.example/authorize');

    await waitFor(() =>
      expect(window.location.assign).toHaveBeenCalledWith(
        'https://accounts.example/authorize',
      ),
    );
  });

  it('does not accept a path as an allowed origin', async () => {
    const errorSpy = jest.spyOn(console, 'error');
    document.body.innerHTML = `<descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;
    const wc = document.querySelector('descope-wc');
    wc.allowedRedirectOrigins = ['https://accounts.example/authorize'];
    wc.handleRedirect('https://accounts.example/authorize');

    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith(
        '[Descope]',
        'Blocked redirect to untrusted origin',
        '',
        expect.any(Error),
      ),
    );
    expect(window.location.assign).not.toHaveBeenCalled();
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
          '[Descope]',
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
        redirectUrl: 'http://localhost/welcome',
      }),
    );

    let isHidden = true;
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get() {
        return isHidden;
      },
    });

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_0&${URL_CODE_PARAM_NAME}=code1&redirectAuthInitiator=android`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });
    expect(window.location.assign).not.toHaveBeenCalledWith(
      'http://localhost/welcome',
    );

    isHidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(
      () =>
        expect(window.location.assign).toHaveBeenCalledWith(
          'http://localhost/welcome',
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
        redirectUrl: 'http://localhost/welcome',
      }),
    );

    const isHidden = true;
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get() {
        return isHidden;
      },
    });

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_0&${URL_CODE_PARAM_NAME}=code1`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(
      () =>
        expect(window.location.assign).toHaveBeenCalledWith(
          'http://localhost/welcome',
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

    fixtures.pageContent = '<span>It works!</span>';
    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_0&${URL_CODE_PARAM_NAME}=code1`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

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

    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });
  });
});
