/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  nextMock,
  emailVerificationStartMock,
  fixtures,
  WAIT_TIMEOUT,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor, fireEvent } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

import { generateSdkResponse } from './testUtils';

const evpPage =
  '<descope-email-field email-verification="true" tabindex="0"></descope-email-field><descope-button id="submitterId">click</descope-button><span>It works!</span>';
const plainPage =
  '<descope-email-field></descope-email-field><descope-button id="submitterId">click</descope-button><span>It works!</span>';

const wcInForm = `<form><descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc></form>`;

const getEvpInput = () =>
  document.querySelector('descope-wc [data-evp-token]') as HTMLInputElement;

const renderFirstScreen = async (html: string) => {
  document.body.innerHTML = html;
  await waitFor(() => screen.getByShadowText('It works!'), {
    timeout: WAIT_TIMEOUT,
  });
};

const lastNextInputs = () => nextMock.mock.calls.at(-1)[5];

const getEmailField = () =>
  document
    .querySelector('descope-wc')
    .shadowRoot.querySelector('descope-email-field');

// the token is read only once the user typed an email
const typeEmail = () => {
  getEmailField().value = 'user@example.com';
};

const flushMicrotasks = async () => {
  for (let i = 0; i < 10; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

// Chrome is the only browser that issues email verification tokens
const setVendor = (vendor: string) => {
  Object.defineProperty(window.navigator, 'vendor', {
    value: vendor,
    configurable: true,
  });
};

describe('web-component email verification', () => {
  const { userAgent, vendor } = window.navigator;

  beforeEach(() => {
    setupWebComponentTestEnv();
    startMock.mockReturnValue(generateSdkResponse());
    Object.defineProperty(window.navigator, 'userAgent', {
      value: `${userAgent} Chrome/150.0.0.0`,
      configurable: true,
    });
    setVendor('Google Inc.');
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
    Object.defineProperty(window.navigator, 'userAgent', {
      value: userAgent,
      configurable: true,
    });
    setVendor(vendor);
  });

  it('does not fetch a nonce when the email field has no email-verification attribute', async () => {
    fixtures.pageContent = plainPage;

    await renderFirstScreen(wcInForm);

    expect(emailVerificationStartMock).not.toHaveBeenCalled();
    expect(getEvpInput()).toBeNull();
  });

  it('does not fetch a nonce outside Chromium', async () => {
    emailVerificationStartMock.mockResolvedValue({
      ok: true,
      data: { nonce: 'n0nce' },
    });
    setVendor('Apple Computer, Inc.');
    fixtures.pageContent = evpPage;

    await renderFirstScreen(wcInForm);

    expect(emailVerificationStartMock).not.toHaveBeenCalled();
    expect(getEvpInput()).toBeNull();
  });

  it('injects a hidden token input with the nonce into the host light DOM', async () => {
    emailVerificationStartMock.mockResolvedValue({
      ok: true,
      data: { nonce: 'n0nce' },
    });
    fixtures.pageContent = evpPage;

    await renderFirstScreen(wcInForm);

    await waitFor(() => expect(getEvpInput()).not.toBeNull(), {
      timeout: WAIT_TIMEOUT,
    });
    expect(emailVerificationStartMock).toHaveBeenCalledTimes(1);
    const input = getEvpInput();
    expect(input.parentElement).toBe(document.querySelector('descope-wc'));
    expect(input.type).toBe('hidden');
    expect(input).toHaveAttribute('autocomplete', 'email-verification-token');
    expect(input).toHaveAttribute('nonce', 'n0nce');
    expect(input).toHaveAttribute('data-exclude-field', 'true');
  });

  it('skips email verification and keeps the flow working when the nonce fetch fails', async () => {
    emailVerificationStartMock.mockRejectedValue(new Error('boom'));
    nextMock.mockReturnValue(generateSdkResponse({ screenId: '1' }));
    fixtures.pageContent = evpPage;

    // set the logger before connecting, the fetch fails during the first render
    const warn = jest.fn();
    document.body.innerHTML = '<form></form>';
    const wc = document.createElement('descope-wc');
    wc.setAttribute('flow-id', 'otpSignInEmail');
    wc.setAttribute('project-id', '1');
    wc.logger = { error: jest.fn(), warn, info: jest.fn(), debug: jest.fn() };
    document.querySelector('form').appendChild(wc);
    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(
      () =>
        expect(warn).toHaveBeenCalledWith(
          'Email verification start failed',
          'boom',
        ),
      { timeout: WAIT_TIMEOUT },
    );
    expect(getEvpInput()).toBeNull();

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });
    expect(lastNextInputs()).not.toHaveProperty('evpToken');
  });

  it('removes the token input when the screen changes', async () => {
    emailVerificationStartMock.mockResolvedValue({
      ok: true,
      data: { nonce: 'n0nce' },
    });
    nextMock.mockReturnValue(generateSdkResponse({ screenId: '1' }));
    fixtures.pageContent = evpPage;

    await renderFirstScreen(wcInForm);
    await waitFor(() => expect(getEvpInput()).not.toBeNull(), {
      timeout: WAIT_TIMEOUT,
    });

    fixtures.pageContent =
      '<descope-button id="submitterId">click</descope-button><span>Second screen</span>';
    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(() => screen.getByShadowText('Second screen'), {
      timeout: WAIT_TIMEOUT,
    });
    expect(getEvpInput()).toBeNull();
    expect(emailVerificationStartMock).toHaveBeenCalledTimes(1);
  });

  it('drops a nonce that resolves after the screen changed', async () => {
    let resolveStart: (value: unknown) => void;
    emailVerificationStartMock.mockReturnValue(
      new Promise((resolve) => {
        resolveStart = resolve;
      }),
    );
    nextMock.mockReturnValue(generateSdkResponse({ screenId: '1' }));
    fixtures.pageContent = evpPage;

    await renderFirstScreen(wcInForm);
    await waitFor(
      () => expect(emailVerificationStartMock).toHaveBeenCalledTimes(1),
      { timeout: WAIT_TIMEOUT },
    );

    fixtures.pageContent =
      '<descope-button id="submitterId">click</descope-button><span>Second screen</span>';
    fireEvent.click(screen.getByShadowText('click'));
    await waitFor(() => screen.getByShadowText('Second screen'), {
      timeout: WAIT_TIMEOUT,
    });

    resolveStart({ ok: true, data: { nonce: 'late-n0nce' } });
    // timers are faked, so let the nonce promise chain settle directly
    await flushMicrotasks();
    expect(getEvpInput()).toBeNull();
  });

  it('does not read the token for a button that skips validation', async () => {
    emailVerificationStartMock.mockResolvedValue({
      ok: true,
      data: { nonce: 'n0nce' },
    });
    nextMock.mockReturnValue(generateSdkResponse({ screenId: '1' }));
    fixtures.pageContent =
      '<descope-email-field email-verification="true"></descope-email-field><descope-button id="backId" formnovalidate="true">back</descope-button><span>It works!</span>';

    await renderFirstScreen(wcInForm);
    await waitFor(() => expect(getEvpInput()).not.toBeNull(), {
      timeout: WAIT_TIMEOUT,
    });
    const form = document.querySelector('form');
    jest.spyOn(form, 'requestSubmit');

    fireEvent.click(screen.getByShadowText('back'));

    await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });
    expect(lastNextInputs()).not.toHaveProperty('evpToken');
    expect(form.requestSubmit).not.toHaveBeenCalled();
  });

  it('submits the form and sends the token the browser wrote on submit', async () => {
    emailVerificationStartMock.mockResolvedValue({
      ok: true,
      data: { nonce: 'n0nce' },
    });
    nextMock.mockReturnValue(generateSdkResponse({ screenId: '1' }));
    fixtures.pageContent = evpPage;

    await renderFirstScreen(wcInForm);
    await waitFor(() => expect(getEvpInput()).not.toBeNull(), {
      timeout: WAIT_TIMEOUT,
    });

    // simulate the browser: the token is written right before the submit event is dispatched
    const form = document.querySelector('form');
    const requestSubmit = form.requestSubmit.bind(form);
    let submitEvent: Event;
    jest.spyOn(form, 'requestSubmit').mockImplementation(() => {
      getEvpInput().value = 'evp-token';
      requestSubmit();
    });
    // a page listener that stops the event must not keep it from being cancelled
    const pageListener = jest.fn((e: Event) => {
      submitEvent = e;
      e.stopPropagation();
    });
    document.addEventListener('submit', pageListener, true);
    const bubbleListener = jest.fn();
    form.addEventListener('submit', bubbleListener);
    typeEmail();

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });
    expect(lastNextInputs()).toEqual(
      expect.objectContaining({ evpToken: 'evp-token' }),
    );
    expect(form.requestSubmit).toHaveBeenCalled();
    expect(pageListener).not.toHaveBeenCalled();
    expect(bubbleListener).not.toHaveBeenCalled();
    expect(submitEvent).toBeUndefined();
    // read once per screen, the token input is removed after it was read
    expect(getEvpInput()).toBeNull();
    document.removeEventListener('submit', pageListener, true);
  });

  it('reads the token even when an unrelated app form control is invalid', async () => {
    emailVerificationStartMock.mockResolvedValue({
      ok: true,
      data: { nonce: 'n0nce' },
    });
    nextMock.mockReturnValue(generateSdkResponse({ screenId: '1' }));
    fixtures.pageContent = evpPage;

    await renderFirstScreen(
      `<form><input name="app" required /><descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc></form>`,
    );
    await waitFor(() => expect(getEvpInput()).not.toBeNull(), {
      timeout: WAIT_TIMEOUT,
    });

    const form = document.querySelector('form');
    const requestSubmit = form.requestSubmit.bind(form);
    jest.spyOn(form, 'requestSubmit').mockImplementation(() => {
      getEvpInput().value = 'evp-token';
      requestSubmit();
    });
    const invalid = jest.fn();
    form
      .querySelector('input[name="app"]')
      .addEventListener('invalid', invalid);
    typeEmail();

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });
    expect(lastNextInputs()).toEqual(
      expect.objectContaining({ evpToken: 'evp-token' }),
    );
    expect(invalid).not.toHaveBeenCalled();
    expect(form.noValidate).toBe(false);
  });

  it('waits until the browser had time to issue after the email field blurred', async () => {
    emailVerificationStartMock.mockResolvedValue({
      ok: true,
      data: { nonce: 'n0nce' },
    });
    nextMock.mockReturnValue(generateSdkResponse({ screenId: '1' }));
    fixtures.pageContent = evpPage;

    await renderFirstScreen(wcInForm);
    await waitFor(() => expect(getEvpInput()).not.toBeNull(), {
      timeout: WAIT_TIMEOUT,
    });
    const form = document.querySelector('form');
    jest.spyOn(form, 'requestSubmit');
    typeEmail();
    getEmailField().focus();
    getEmailField().blur();
    jest.advanceTimersByTime(300);

    fireEvent.click(screen.getByShadowText('click'));
    await flushMicrotasks();
    jest.advanceTimersByTime(599);
    await flushMicrotasks();
    expect(form.requestSubmit).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });
    expect(form.requestSubmit).toHaveBeenCalled();
  });

  it('does not wait when the email field blurred long enough ago', async () => {
    emailVerificationStartMock.mockResolvedValue({
      ok: true,
      data: { nonce: 'n0nce' },
    });
    nextMock.mockReturnValue(generateSdkResponse({ screenId: '1' }));
    fixtures.pageContent = evpPage;

    await renderFirstScreen(wcInForm);
    await waitFor(() => expect(getEvpInput()).not.toBeNull(), {
      timeout: WAIT_TIMEOUT,
    });
    const form = document.querySelector('form');
    jest.spyOn(form, 'requestSubmit');
    typeEmail();
    getEmailField().focus();
    getEmailField().blur();
    jest.advanceTimersByTime(900);

    fireEvent.click(screen.getByShadowText('click'));
    await flushMicrotasks();
    expect(form.requestSubmit).toHaveBeenCalled();
  });

  it('blurs the email field when the submit comes from Enter in it', async () => {
    emailVerificationStartMock.mockResolvedValue({
      ok: true,
      data: { nonce: 'n0nce' },
    });
    nextMock.mockReturnValue(generateSdkResponse({ screenId: '1' }));
    fixtures.pageContent = evpPage;

    await renderFirstScreen(wcInForm);
    await waitFor(() => expect(getEvpInput()).not.toBeNull(), {
      timeout: WAIT_TIMEOUT,
    });
    const form = document.querySelector('form');
    jest.spyOn(form, 'requestSubmit');
    typeEmail();
    getEmailField().focus();

    fireEvent.keyDown(getEmailField(), { key: 'Enter' });
    await flushMicrotasks();
    expect(getEmailField()).not.toHaveFocus();
    // the blur just started the issuance, so the read waits the full time
    jest.advanceTimersByTime(899);
    await flushMicrotasks();
    expect(form.requestSubmit).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    await waitFor(() => expect(form.requestSubmit).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });
  });

  it('does not wait or read the token when no email was typed', async () => {
    emailVerificationStartMock.mockResolvedValue({
      ok: true,
      data: { nonce: 'n0nce' },
    });
    nextMock.mockReturnValue(generateSdkResponse({ screenId: '1' }));
    fixtures.pageContent = evpPage;

    await renderFirstScreen(wcInForm);
    await waitFor(() => expect(getEvpInput()).not.toBeNull(), {
      timeout: WAIT_TIMEOUT,
    });
    const form = document.querySelector('form');
    jest.spyOn(form, 'requestSubmit');

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });
    expect(form.requestSubmit).not.toHaveBeenCalled();
  });

  it('does not send a token when the browser wrote none, and keeps the input', async () => {
    emailVerificationStartMock.mockResolvedValue({
      ok: true,
      data: { nonce: 'n0nce' },
    });
    nextMock.mockReturnValue(generateSdkResponse({ screenId: '1' }));
    fixtures.pageContent = evpPage;

    await renderFirstScreen(wcInForm);
    await waitFor(() => expect(getEvpInput()).not.toBeNull(), {
      timeout: WAIT_TIMEOUT,
    });

    typeEmail();
    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });
    expect(lastNextInputs()).not.toHaveProperty('evpToken');
    // a later submit on this screen can still get a token
    expect(getEvpInput()).not.toBeNull();
  });
});
