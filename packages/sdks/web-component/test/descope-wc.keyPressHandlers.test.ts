/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  nextMock,
  fixtures,
  WAIT_TIMEOUT,
  generateSdkResponse,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

describe('web-component', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  describe('key press handler management', () => {
    it('should disable key press handler when rendering custom screen', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      fixtures.pageContent = `<div>Loaded123</div><descope-button id="submit">Submit</descope-button>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc') as any;

      // Set up onScreenUpdate to return true for custom screen
      const onScreenUpdate = jest.fn(() => true);
      descopeWc.onScreenUpdate = onScreenUpdate;

      // Spy on the key press handler methods before initialization
      const disableKeyPressHandlerSpy = jest.spyOn(
        descopeWc,
        'disableKeyPressHandler',
      );
      const handleKeyPressSpy = jest.spyOn(descopeWc, 'handleKeyPress');

      // Wait for onScreenUpdate to be called
      await waitFor(() => expect(onScreenUpdate).toHaveBeenCalledTimes(1), {
        timeout: WAIT_TIMEOUT,
      });

      // Verify key press handler is disabled for custom screens
      await waitFor(
        () => expect(disableKeyPressHandlerSpy).toHaveBeenCalled(),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      // Verify key press handler is not enabled
      expect(handleKeyPressSpy).not.toHaveBeenCalled();

      // Test that Enter key doesn't trigger form submission when custom screen is rendered
      const rootEle = descopeWc.shadowRoot.querySelector('#root');
      expect(rootEle.onkeydown).toBeNull();
    });

    it('should enable key press handler when rendering regular flow screen', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      fixtures.pageContent = `<div>Loaded123</div><descope-button id="submit">Submit</descope-button>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc') as any;

      // Set up onScreenUpdate to return false for regular screen
      const onScreenUpdate = jest.fn(() => false);
      descopeWc.onScreenUpdate = onScreenUpdate;

      // Spy on the key press handler methods before initialization
      const handleKeyPressSpy = jest.spyOn(descopeWc, 'handleKeyPress');
      const disableKeyPressHandlerSpy = jest.spyOn(
        descopeWc,
        'disableKeyPressHandler',
      );

      // Wait for onScreenUpdate to be called
      await waitFor(() => expect(onScreenUpdate).toHaveBeenCalledTimes(1), {
        timeout: WAIT_TIMEOUT,
      });

      // Wait for the content to be rendered (means regular screen is shown)
      await waitFor(() => screen.getByShadowText('Loaded123'), {
        timeout: WAIT_TIMEOUT,
      });

      // Verify key press handler is enabled for regular screens
      await waitFor(() => expect(handleKeyPressSpy).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });

      // Verify key press handler is not disabled
      expect(disableKeyPressHandlerSpy).not.toHaveBeenCalled();

      // Test that Enter key handler is properly set
      const rootEle = descopeWc.shadowRoot.querySelector('#root');
      expect(rootEle.onkeydown).toEqual(expect.any(Function));
    });

    it('should enable key press handler when onScreenUpdate is not set', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      fixtures.pageContent = `<div>Loaded123</div><descope-button id="submit">Submit</descope-button>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc') as any;
      // No onScreenUpdate set - should render regular screen

      // Spy on the key press handler methods
      const handleKeyPressSpy = jest.spyOn(descopeWc, 'handleKeyPress');
      const disableKeyPressHandlerSpy = jest.spyOn(
        descopeWc,
        'disableKeyPressHandler',
      );

      // Wait for the content to be rendered
      await waitFor(() => screen.getByShadowText('Loaded123'), {
        timeout: WAIT_TIMEOUT,
      });

      // Verify key press handler is enabled for regular screens
      await waitFor(() => expect(handleKeyPressSpy).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });

      // Verify key press handler is not disabled
      expect(disableKeyPressHandlerSpy).not.toHaveBeenCalled();

      // Test that Enter key handler is properly set
      const rootEle = descopeWc.shadowRoot.querySelector('#root');
      expect(rootEle.onkeydown).toEqual(expect.any(Function));
    });

    it('should toggle key press handler when switching between custom and regular screens', async () => {
      startMock.mockReturnValue(generateSdkResponse());
      nextMock.mockReturnValue(generateSdkResponse({ screenId: '1' }));

      fixtures.pageContent = `<div>Loaded123</div><descope-button id="submit">Submit</descope-button>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const descopeWc = document.querySelector('descope-wc') as any;

      // Start with custom screen
      let shouldShowCustomScreen = true;
      const onScreenUpdate = jest.fn(() => shouldShowCustomScreen);
      descopeWc.onScreenUpdate = onScreenUpdate;

      // Spy on the key press handler methods
      const handleKeyPressSpy = jest.spyOn(descopeWc, 'handleKeyPress');
      const disableKeyPressHandlerSpy = jest.spyOn(
        descopeWc,
        'disableKeyPressHandler',
      );

      // Wait for first onScreenUpdate call (custom screen)
      await waitFor(() => expect(onScreenUpdate).toHaveBeenCalledTimes(1), {
        timeout: WAIT_TIMEOUT,
      });

      // First call should disable key press handler (custom screen)
      await waitFor(
        () => expect(disableKeyPressHandlerSpy).toHaveBeenCalledTimes(1),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      // Switch to regular screen
      shouldShowCustomScreen = false;

      // Get the next function from the onScreenUpdate call
      const next = onScreenUpdate.mock.calls[0][2];

      // Clear spies to track next calls
      handleKeyPressSpy.mockClear();
      disableKeyPressHandlerSpy.mockClear();

      // Trigger transition to regular screen
      next('next', {});

      // Wait for second onScreenUpdate call
      await waitFor(() => expect(onScreenUpdate).toHaveBeenCalledTimes(2), {
        timeout: WAIT_TIMEOUT,
      });

      // Should now enable key press handler (regular screen)
      await waitFor(() => expect(handleKeyPressSpy).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });

      // Should not disable again
      expect(disableKeyPressHandlerSpy).not.toHaveBeenCalled();

      // Test that Enter key handler is properly set
      const rootEle = descopeWc.shadowRoot.querySelector('#root');
      expect(rootEle.onkeydown).toEqual(expect.any(Function));
    });
  });
});
