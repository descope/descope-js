/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  nextMock,
  fixtures,
  WAIT_TIMEOUT,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor, fireEvent } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

import { generateSdkResponse } from './testUtils';

describe('web-component', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  describe('CSP', () => {
    it('should add nonce to window', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      fixtures.pageContent = `<div>Loaded123</div><descope-link class="descope-link" href="{{user.name}}">ho!</descope-link>`;

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

      fixtures.pageContent =
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
            false,
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

      fixtures.pageContent = `<div>Loaded123</div><descope-link class="descope-link" href="{{user.name}}">ho!</descope-link>`;

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
          expect.objectContaining({
            data: expect.objectContaining({
              inboundAppApproveScopes: [{ a: 1 }],
            }),
          }),
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

      fixtures.pageContent = `<div>Loaded123</div><descope-link class="descope-link" href="{{user.name}}">ho!</descope-link>`;

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

      fixtures.pageContent = `<div>Loaded123</div><descope-link class="descope-link" href="{{user.name}}">ho!</descope-link>`;

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

      fixtures.pageContent = `<div>Loaded123</div><descope-link class="descope-link" href="{{user.name}}">ho!</descope-link>`;

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

      fixtures.pageContent = `<div>Loaded123</div><descope-link class="descope-link" href="{{user.name}}">ho!</descope-link>`;

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

      fixtures.pageContent = `<div>Loaded123</div><descope-link class="descope-link" href="{{user.name}}">ho!</descope-link>`;

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
    it('should hide components when componentsState contains hide state', async () => {
      startMock.mockReturnValue(
        generateSdkResponse({
          screenState: {
            componentsState: {
              'test-button': 'hide',
              'test-input': 'hide',
            },
          },
        }),
      );

      fixtures.pageContent = `<div>
        <descope-button id="test-button">Click me</descope-button>
        <input id="test-input" />
        <descope-text id="visible-text">Visible</descope-text>
      </div>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc');

      await waitFor(() => screen.getByShadowText('Visible'), {
        timeout: WAIT_TIMEOUT,
      });

      const hiddenButton = descopeWc.shadowRoot.querySelector('#test-button');
      const hiddenInput = descopeWc.shadowRoot.querySelector('#test-input');
      const visibleText = descopeWc.shadowRoot.querySelector('#visible-text');

      expect(hiddenButton).toHaveClass('hidden');
      expect(hiddenInput).toHaveClass('hidden');
      expect(visibleText).not.toHaveClass('hidden');
    });

    it('should not validate hidden components', async () => {
      startMock.mockReturnValue(
        generateSdkResponse({
          screenState: {
            componentsState: {
              'test-input': 'hide',
            },
          },
        }),
      );

      fixtures.pageContent = `<div>
        <descope-button id="submit-button">Submit</descope-button>
        <input id="test-input" name="test-input" required />
      </div>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc');

      await waitFor(() => screen.getByShadowText('Submit'), {
        timeout: WAIT_TIMEOUT,
      });

      const hiddenInput = descopeWc.shadowRoot.querySelector('#test-input');
      hiddenInput.checkValidity = jest.fn().mockReturnValue(false);
      hiddenInput.reportValidity = jest.fn();

      const submitButton = descopeWc.shadowRoot.querySelector('#submit-button');
      submitButton.click();

      await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });

      expect(hiddenInput.checkValidity).not.toHaveBeenCalled();
      expect(hiddenInput.reportValidity).not.toHaveBeenCalled();
    });

    // Regression for descope/etc#19151. The condition targets a container, so
    // the required input inside keeps a clean class list. Before the fix it
    // was still validated and blocked the submit with nothing shown to the
    // user, because the field it complained about was not rendered.
    it('should not validate a required input inside a hidden container', async () => {
      startMock.mockReturnValue(
        generateSdkResponse({
          screenState: {
            componentsState: {
              'zip-box': 'hide',
            },
          },
        }),
      );

      fixtures.pageContent = `<div>
        <descope-button id="submit-button">Submit</descope-button>
        <div id="zip-box"><input id="zip" name="zip" required /></div>
      </div>`;

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc');

      await waitFor(() => screen.getByShadowText('Submit'), {
        timeout: WAIT_TIMEOUT,
      });

      const zipBox = descopeWc.shadowRoot.querySelector('#zip-box');
      const zipInput = descopeWc.shadowRoot.querySelector('#zip');

      // The shape of the bug: the container is hidden, the input is not.
      expect(zipBox).toHaveClass('hidden');
      expect(zipInput).not.toHaveClass('hidden');

      zipInput.checkValidity = jest.fn().mockReturnValue(false);
      zipInput.reportValidity = jest.fn();

      descopeWc.shadowRoot.querySelector('#submit-button').click();

      await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });

      expect(zipInput.checkValidity).not.toHaveBeenCalled();
      expect(zipInput.reportValidity).not.toHaveBeenCalled();
    });

    // Guards the opposite direction: the ancestor walk must not switch off
    // validation for fields that are plainly visible.
    it('should still validate a required input when no container is hidden', async () => {
      startMock.mockReturnValue(generateSdkResponse({ screenState: {} }));

      fixtures.pageContent = `<div>
        <descope-button id="submit-button">Submit</descope-button>
        <div id="zip-box"><input id="zip" name="zip" required /></div>
      </div>`;

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc');

      await waitFor(() => screen.getByShadowText('Submit'), {
        timeout: WAIT_TIMEOUT,
      });

      const zipInput = descopeWc.shadowRoot.querySelector('#zip');
      zipInput.checkValidity = jest.fn().mockReturnValue(false);
      zipInput.reportValidity = jest.fn();

      descopeWc.shadowRoot.querySelector('#submit-button').click();

      await waitFor(() => expect(zipInput.reportValidity).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });
      expect(nextMock).not.toHaveBeenCalled();
    });

    // Skipping validation must not also drop the value. A user can fill a
    // field and then hide it by changing the control above it, and flows read
    // those values server side.
    it('still posts the value of an input inside a hidden container', async () => {
      startMock.mockReturnValue(
        generateSdkResponse({
          screenState: {
            componentsState: {
              'zip-box': 'hide',
            },
          },
        }),
      );

      fixtures.pageContent = `<div>
        <descope-button id="submit-button">Submit</descope-button>
        <div id="zip-box"><input id="zip" name="zip" required /></div>
      </div>`;

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc');

      await waitFor(() => screen.getByShadowText('Submit'), {
        timeout: WAIT_TIMEOUT,
      });

      descopeWc.shadowRoot.querySelector('#zip').value = '90210';
      descopeWc.shadowRoot.querySelector('#submit-button').click();

      await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });

      expect(nextMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ zip: '90210' }),
        expect.anything(),
      );
    });

    it('should disable components when componentsState contains disable state', async () => {
      startMock.mockReturnValue(
        generateSdkResponse({
          screenState: {
            componentsState: {
              'test-submit-button': 'disable',
              'test-email-input': 'disable',
            },
          },
        }),
      );

      fixtures.pageContent = `<div>
        <descope-button id="test-submit-button">Submit</descope-button>
        <input id="test-email-input" />
        <descope-button id="enabled-button">Enabled</descope-button>
      </div>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc');

      await waitFor(() => screen.getByShadowText('Submit'), {
        timeout: WAIT_TIMEOUT,
      });

      const disabledButton = descopeWc.shadowRoot.querySelector(
        '#test-submit-button',
      );
      const disabledInput =
        descopeWc.shadowRoot.querySelector('#test-email-input');
      const enabledButton =
        descopeWc.shadowRoot.querySelector('#enabled-button');

      expect(disabledButton).toHaveAttribute('disabled', 'true');
      expect(disabledInput).toHaveAttribute('disabled', 'true');
      expect(enabledButton).toBeEnabled();
    });

    it('should set readonly on components when componentsState contains read-only state', async () => {
      startMock.mockReturnValue(
        generateSdkResponse({
          screenState: {
            componentsState: {
              'test-email-input': 'read-only',
              'test-totp-input': 'read-only',
            },
          },
        }),
      );

      fixtures.pageContent = `<div>
        <input id="test-email-input" />
        <input id="test-totp-input" />
        <input id="editable-input" />
        <descope-button id="submit-button">Submit</descope-button>
      </div>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc');

      await waitFor(() => screen.getByShadowText('Submit'), {
        timeout: WAIT_TIMEOUT,
      });

      const readonlyEmail =
        descopeWc.shadowRoot.querySelector('#test-email-input');
      const readonlyTotp =
        descopeWc.shadowRoot.querySelector('#test-totp-input');
      const editableInput =
        descopeWc.shadowRoot.querySelector('#editable-input');

      expect(readonlyEmail).toHaveAttribute('readonly', 'true');
      expect(readonlyTotp).toHaveAttribute('readonly', 'true');
      expect(readonlyEmail).not.toHaveAttribute('disabled');
      expect(readonlyTotp).not.toHaveAttribute('disabled');
      expect(editableInput).not.toHaveAttribute('readonly');
    });

    it('should handle empty componentsState gracefully', async () => {
      startMock.mockReturnValue(
        generateSdkResponse({
          screenState: {
            componentsState: {},
          },
        }),
      );

      fixtures.pageContent = `<div>
        <descope-button id="btn-1">Button</descope-button>
        <input id="input-1" />
      </div>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc');

      await waitFor(() => screen.getByShadowText('Button'), {
        timeout: WAIT_TIMEOUT,
      });

      const btn = descopeWc.shadowRoot.querySelector('#btn-1');
      const input = descopeWc.shadowRoot.querySelector('#input-1');

      expect(btn).not.toHaveClass('hidden');
      expect(btn).toBeEnabled();
      expect(input).not.toHaveClass('hidden');
      expect(input).toBeEnabled();
    });

    it('should handle undefined componentsState gracefully', async () => {
      startMock.mockReturnValue(
        generateSdkResponse({
          screenState: {},
        }),
      );

      fixtures.pageContent = `<div>
        <descope-button id="btn-1">Button</descope-button>
        <input id="input-1" />
      </div>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc');

      await waitFor(() => screen.getByShadowText('Button'), {
        timeout: WAIT_TIMEOUT,
      });

      const btn = descopeWc.shadowRoot.querySelector('#btn-1');
      const input = descopeWc.shadowRoot.querySelector('#input-1');

      expect(btn).not.toHaveClass('hidden');
      expect(btn).toBeEnabled();
      expect(input).not.toHaveClass('hidden');
      expect(input).toBeEnabled();
    });

    it('should allow lazy render when window attribute is set (for mobile)', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      window.descopeBridge = {};

      fixtures.pageContent = `<div>Loaded123</div><descope-link class="descope-link" href="{{user.name}}">ho!</descope-link>`;

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
