/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  fixtures,
  generateSdkResponse,
  createSdk,
  WAIT_TIMEOUT,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor, fireEvent } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

import { HAS_DYNAMIC_VALUES_ATTR_NAME } from '../src/lib/constants';

describe('web-component start options', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  it('should show form validation error when input is not valid', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.pageContent =
      '<descope-button id="submitterId">click</descope-button><input id="email" name="email" required placeholder="email" class="descope-input"></input><span>hey</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('click'), {
      timeout: 20000,
    });

    const buttonEle = await screen.findByShadowText('click');

    const inputEle = screen.getByShadowPlaceholderText(
      'email',
    ) as HTMLInputElement;

    inputEle.reportValidity = jest.fn();
    inputEle.checkValidity = jest.fn();

    fireEvent.click(buttonEle);

    await waitFor(() => expect(inputEle.reportValidity).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(() => expect(inputEle.checkValidity).toHaveBeenCalled());
  });

  it('should call start with redirect url when provided', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.pageContent =
      '<descope-button id="submitterId">click</descope-button><input id="email" name="email"></input><span>hey</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1" redirect-url="http://custom.url"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('hey'), {
      timeout: 20000,
    });

    await waitFor(() =>
      expect(startMock).toHaveBeenCalledWith(
        'sign-in',
        expect.objectContaining({ redirectUrl: 'http://custom.url' }),
        undefined,
        '',
        '1.2.3',
        {
          otpSignInEmail: 1,
          'versioned-flow': 1,
        },
        {},
      ),
    );
  });

  it('should call start with form and client when provided', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    fixtures.configContent = {
      ...fixtures.configContent,
      flows: {
        'sign-in': { version: 1 },
      },
    };
    fixtures.pageContent = '<div>hey</div>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1" form='{"displayName": "dn", "email": "test", "nested": { "key": "value" }, "another": { "value": "a", "disabled": true }}' client='{"email": "test2", "nested": { "key": "value" }}'></descope-wc>`;

    await waitFor(() => screen.findByShadowText('hey'), {
      timeout: 20000,
    });

    await waitFor(() =>
      expect(startMock).toHaveBeenCalledWith(
        'sign-in',
        expect.objectContaining({
          client: {
            email: 'test2',
            nested: { key: 'value' },
          },
        }),
        undefined,
        '',
        '1.2.3',
        {
          'sign-in': 1,
        },
        {
          email: 'test',
          'form.email': 'test',
          'nested.key': 'value',
          'form.nested.key': 'value',
          another: 'a',
          'form.another': 'a',
          'form.displayName': 'dn',
          'form.fullName': 'dn',
          displayName: 'dn',
          fullName: 'dn',
        },
      ),
    );
  });

  it('should call start with outbound attributes when provided', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    fixtures.configContent = {
      ...fixtures.configContent,
      flows: {
        'sign-in': { version: 1 },
      },
    };
    fixtures.pageContent = '<div>hey</div>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1" outbound-app-id="app-id" outbound-app-scopes='["scope1", "scope2"]'></descope-wc>`;

    await waitFor(() => screen.findByShadowText('hey'), {
      timeout: 20000,
    });

    await waitFor(() =>
      expect(startMock).toHaveBeenCalledWith(
        'sign-in',
        expect.objectContaining({
          outboundAppId: 'app-id',
          outboundAppScopes: ['scope1', 'scope2'],
        }),
        undefined,
        '',
        '1.2.3',
        {
          'sign-in': 1,
        },
        {},
      ),
    );
  });

  it('should call start with refresh cookie name when provided', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    fixtures.configContent = {
      ...fixtures.configContent,
      flows: {
        'sign-in': { version: 1 },
      },
    };
    fixtures.pageContent = '<div>hey</div>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1" refresh-cookie-name="cookie-1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('hey'), {
      timeout: 20000,
    });

    await waitFor(() =>
      expect(createSdk).toHaveBeenCalledWith(
        expect.objectContaining({
          refreshCookieName: 'cookie-1',
        }),
      ),
    );
  });

  it('should update dynamic attribute values', async () => {
    fixtures.pageContent = `<input ${HAS_DYNAMIC_VALUES_ATTR_NAME}="" testAttr="{{form.varName}}" id="email" name="email" placeholder="email"></input>`;

    startMock.mockReturnValue(
      generateSdkResponse({
        screenState: {
          form: { varName: 'varValue' },
        },
      }),
    );

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id=1></descope-wc>`;

    const inputEle = await waitFor(
      () => screen.getByShadowPlaceholderText('email'),
      {
        timeout: WAIT_TIMEOUT,
      },
    );

    await waitFor(
      () => expect(inputEle).toHaveAttribute('testAttr', 'varValue'),
      { timeout: WAIT_TIMEOUT },
    );
  });
});
