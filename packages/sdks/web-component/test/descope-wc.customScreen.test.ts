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
