/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  nextMock,
  fixtures,
  generateSdkResponse,
  WAIT_TIMEOUT,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor, fireEvent } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

describe('web-component enter key behavior', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  it('When there is a single button and pressing on enter, it clicks the button', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    fixtures.pageContent =
      '<descope-button id="buttonId">Click</descope-button><input id="email" name="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const rootEle = document
      .getElementsByTagName('descope-wc')[0]
      .shadowRoot.querySelector('#root');

    fireEvent.keyDown(rootEle, { key: 'Enter', code: 13, charCode: 13 });

    await waitFor(() => expect(nextMock).toHaveBeenCalled());
  });

  it('should not load components which are already loaded', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.pageContent =
      '<descope-test-button id="email">Button</descope-test-button><span>It works!</span>';

    customElements.define('descope-test-button', class extends HTMLElement {});

    const DescopeUI = { 'descope-test-button': jest.fn() };
    globalThis.DescopeUI = DescopeUI;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Button'), {
      timeout: 20000,
    });

    expect(DescopeUI['descope-test-button']).not.toHaveBeenCalled();
  });

  it('When there is a single "sso" button and pressing on enter, it clicks the button', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    fixtures.pageContent =
      '<descope-button id="noClick">No Click</descope-button><descope-button id="click" data-type="sso">Click</descope-button><input id="email" name="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const rootEle = document
      .getElementsByTagName('descope-wc')[0]
      .shadowRoot.querySelector('#root');

    fireEvent.keyDown(rootEle, { key: 'Enter', code: 13, charCode: 13 });

    await waitFor(() =>
      expect(nextMock).toHaveBeenCalledWith(
        '0',
        '0',
        'click',
        1,
        '1.2.3',
        expect.any(Object),
        false,
      ),
    );
  });

  it('When there is a single "generic" button and pressing on enter, it clicks the button', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    fixtures.pageContent =
      '<descope-button id="noClick">No Click</descope-button><descope-button id="click" data-type="button">Click</descope-button><input id="email" name="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const rootEle = document
      .getElementsByTagName('descope-wc')[0]
      .shadowRoot.querySelector('#root');

    fireEvent.keyDown(rootEle, { key: 'Enter', code: 13, charCode: 13 });

    await waitFor(() =>
      expect(nextMock).toHaveBeenCalledWith(
        '0',
        '0',
        'click',
        1,
        '1.2.3',
        expect.any(Object),
        false,
      ),
    );
  });

  it('When there are multiple "generic" buttons and pressing on enter, it does not click any button', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    fixtures.pageContent =
      '<descope-button id="1" data-type="button">Click</descope-button><descope-button id="2" data-type="button">Click</descope-button><input id="email" name="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const rootEle = document
      .getElementsByTagName('descope-wc')[0]
      .shadowRoot.querySelector('#root');

    fireEvent.keyDown(rootEle, { key: 'Enter', code: 13, charCode: 13 });

    await waitFor(() => expect(nextMock).not.toHaveBeenCalled());
  });

  it('When there are multiple "sso" buttons and pressing on enter, it does not click any button', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    fixtures.pageContent =
      '<descope-button id="1" data-type="sso">Click</descope-button><descope-button id="2" data-type="sso">Click</descope-button><input id="email" name="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const rootEle = document
      .getElementsByTagName('descope-wc')[0]
      .shadowRoot.querySelector('#root');

    fireEvent.keyDown(rootEle, { key: 'Enter', code: 13, charCode: 13 });

    await waitFor(() => expect(nextMock).not.toHaveBeenCalled());
  });

  it('When there are multiple "generic" and "sso" buttons and pressing on enter, it does not click any button', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    fixtures.pageContent =
      '<descope-button id="1" data-type="button">Click</descope-button><descope-button id="1" data-type="button">Click</descope-button><descope-button id="1" data-type="sso">Click</descope-button><descope-button id="2" data-type="sso">Click</descope-button><input id="email" name="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const rootEle = document
      .getElementsByTagName('descope-wc')[0]
      .shadowRoot.querySelector('#root');

    fireEvent.keyDown(rootEle, { key: 'Enter', code: 13, charCode: 13 });

    await waitFor(() => expect(nextMock).not.toHaveBeenCalled());
  });

  it('When there are multiple button and pressing on enter, it does not clicks any button', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    fixtures.pageContent =
      '<descope-button id="buttonId">Click</descope-button><descope-button id="buttonId1">Click2</descope-button><input id="email" name="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const rootEle = document
      .getElementsByTagName('descope-wc')[0]
      .shadowRoot.querySelector('#root');

    fireEvent.keyDown(rootEle, { key: 'Enter', code: 13, charCode: 13 });

    await waitFor(() => expect(nextMock).not.toHaveBeenCalled());
  });

  it('When there is a passcode with auto-submit enabled, it auto-submits on input event if value is valid', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse());

    globalThis.DescopeUI = {
      'descope-passcode': jest.fn(),
    };

    fixtures.pageContent =
      '<descope-passcode data-auto-submit="true" data-testid="otp-code"></descope-passcode><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const codeComponent = screen.getByShadowTestId(
      'otp-code',
    ) as HTMLInputElement;
    codeComponent.checkValidity = jest.fn(() => true);

    fireEvent.input(codeComponent);

    expect(startMock).toHaveBeenCalled();
    await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });
  });
});
