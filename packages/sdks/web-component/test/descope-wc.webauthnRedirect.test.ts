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

    fixtures.pageContent = '<span>It works!</span>';

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

    fixtures.pageContent = '<span>It works!</span>';

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

describe('web-component redirect', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
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
        redirectUrl: 'https://myurl.com',
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
      'https://myurl.com',
    );

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
