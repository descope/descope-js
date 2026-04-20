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
  getLastUserLoginIdMock,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor, fireEvent } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

import {
  DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
  DESCOPE_LAST_AUTH_IN_FLIGHT_LOCAL_STORAGE_KEY,
} from '../src/lib/constants';

class DescopeLastAuthBadge extends HTMLElement {}
if (!customElements.get('descope-attachment')) {
  customElements.define('descope-attachment', DescopeLastAuthBadge);
}

describe('web-component lastAuth', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  describe('lastUsedPerScreen', () => {
    it('should save the clicked button id per screen to localStorage on flow completion', async () => {
      startMock.mockReturnValueOnce(
        generateSdkResponse({ screenId: 'screen-1' }),
      );
      nextMock.mockReturnValueOnce(
        generateSdkResponse({
          status: 'completed',
          lastAuth: { authMethod: 'otp', loginId: 'user@example.com' },
        }),
      );

      fixtures.pageContent =
        '<descope-button id="my-button" data-opt-in-last-used="true">click</descope-button><span>Loaded</span>';

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(
        () => {
          const lastAuth = JSON.parse(
            localStorage.getItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY) || '{}',
          );
          expect(lastAuth.lastUsedPerScreen?.['screen-1']).toBe('my-button');
        },
        { timeout: WAIT_TIMEOUT },
      );
    });

    it('should not track a button without opt-in-last-used attr', async () => {
      startMock.mockReturnValueOnce(
        generateSdkResponse({ screenId: 'screen-1' }),
      );
      nextMock.mockReturnValueOnce(
        generateSdkResponse({
          status: 'completed',
          lastAuth: { authMethod: 'otp', loginId: 'user@example.com' },
        }),
      );

      fixtures.pageContent =
        '<descope-button id="my-button">click</descope-button><span>Loaded</span>';

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(
        () => {
          const lastAuth = JSON.parse(
            localStorage.getItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY) || '{}',
          );
          expect(lastAuth.lastUsedPerScreen?.['screen-1']).toBeUndefined();
        },
        { timeout: WAIT_TIMEOUT },
      );
    });

    it('should write to in-flight storage on click, not directly to dls_last_auth', async () => {
      startMock.mockReturnValueOnce(
        generateSdkResponse({ screenId: 'screen-1' }),
      );
      // no nextMock — flow does not complete

      fixtures.pageContent =
        '<descope-button id="my-button" data-opt-in-last-used="true">click</descope-button><span>Loaded</span>';

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(
        () => {
          const inFlight = JSON.parse(
            localStorage.getItem(
              DESCOPE_LAST_AUTH_IN_FLIGHT_LOCAL_STORAGE_KEY,
            ) || '{}',
          );
          expect(inFlight['screen-1']).toBe('my-button');
          // dls_last_auth must NOT be updated before completion
          expect(
            localStorage.getItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY),
          ).toBeNull();
        },
        { timeout: WAIT_TIMEOUT },
      );
    });

    it('should clear in-flight storage on flow completion', async () => {
      localStorage.setItem(
        DESCOPE_LAST_AUTH_IN_FLIGHT_LOCAL_STORAGE_KEY,
        JSON.stringify({ 'screen-1': 'my-button' }),
      );

      startMock.mockReturnValueOnce(
        generateSdkResponse({ screenId: 'screen-1' }),
      );
      nextMock.mockReturnValueOnce(
        generateSdkResponse({
          status: 'completed',
          lastAuth: { authMethod: 'otp', loginId: 'user@example.com' },
        }),
      );

      fixtures.pageContent =
        '<descope-button id="my-button" data-opt-in-last-used="true">click</descope-button><span>Loaded</span>';

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(
        () => {
          expect(
            localStorage.getItem(DESCOPE_LAST_AUTH_IN_FLIGHT_LOCAL_STORAGE_KEY),
          ).toBeNull();
        },
        { timeout: WAIT_TIMEOUT },
      );
    });

    it('should clear in-flight storage when a new flow starts', async () => {
      localStorage.setItem(
        DESCOPE_LAST_AUTH_IN_FLIGHT_LOCAL_STORAGE_KEY,
        JSON.stringify({ 'screen-1': 'old-button' }),
      );

      startMock.mockReturnValueOnce(
        generateSdkResponse({ screenId: 'screen-1' }),
      );

      // no executionId in URL → fresh flow start
      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(
        () => {
          expect(
            localStorage.getItem(DESCOPE_LAST_AUTH_IN_FLIGHT_LOCAL_STORAGE_KEY),
          ).toBeNull();
        },
        { timeout: WAIT_TIMEOUT },
      );
    });

    it('should not save lastUsedPerScreen when button has no id', async () => {
      startMock.mockReturnValueOnce(
        generateSdkResponse({ screenId: 'screen-1' }),
      );
      nextMock.mockReturnValueOnce(
        generateSdkResponse({
          status: 'completed',
          lastAuth: { authMethod: 'otp', loginId: 'user@example.com' },
        }),
      );

      fixtures.pageContent =
        '<descope-button>click</descope-button><span>Loaded</span>';

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(
        () => {
          const lastAuth = JSON.parse(
            localStorage.getItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY) || '{}',
          );
          expect(lastAuth.lastUsedPerScreen).toEqual({});
        },
        { timeout: WAIT_TIMEOUT },
      );
    });

    it('should track the last clicked button per screen across multiple clicks', async () => {
      startMock.mockReturnValueOnce(
        generateSdkResponse({ screenId: 'screen-1' }),
      );
      nextMock
        .mockReturnValueOnce(generateSdkResponse({ screenId: 'screen-1' }))
        .mockReturnValueOnce(
          generateSdkResponse({
            status: 'completed',
            lastAuth: { authMethod: 'otp', loginId: 'user@example.com' },
          }),
        );

      fixtures.pageContent =
        '<descope-button id="button-a" data-opt-in-last-used="true">click a</descope-button><descope-button id="button-b" data-opt-in-last-used="true">click b</descope-button><span>Loaded</span>';

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      fireEvent.click(screen.getByShadowText('click a'));

      await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(1), {
        timeout: WAIT_TIMEOUT,
      });

      // Same screen rendered again, click a different button
      fireEvent.click(screen.getByShadowText('click b'));

      await waitFor(
        () => {
          const lastAuth = JSON.parse(
            localStorage.getItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY) || '{}',
          );
          expect(lastAuth.lastUsedPerScreen?.['screen-1']).toBe('button-b');
        },
        { timeout: WAIT_TIMEOUT },
      );
    });
  });

  describe('#applyLastAuthBadge', () => {
    it('should wrap the last used button with the badge component for the current screen', async () => {
      const loginId = 'user@example.com';
      getLastUserLoginIdMock.mockReturnValue(loginId);

      localStorage.setItem(
        DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
        JSON.stringify({
          authMethod: 'otp',
          loginId,
          lastUsedPerScreen: { '0': 'my-button' },
        }),
      );

      startMock.mockReturnValueOnce(generateSdkResponse());

      fixtures.pageContent = `
        <descope-attachment id="badge" data-type="last-auth-badge"></descope-attachment>
        <descope-button id="my-button" data-opt-in-last-used="true">click</descope-button>
        <span>Loaded</span>
      `;

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(
        () => {
          const shadowRoot = document.querySelector('descope-wc').shadowRoot;
          const badgeEl = shadowRoot.querySelector('descope-attachment');
          expect(badgeEl.contains(shadowRoot.querySelector('#my-button'))).toBe(
            true,
          );
        },
        { timeout: WAIT_TIMEOUT },
      );
    });

    it('should not nest the button when no lastUsedPerScreen in localStorage', async () => {
      getLastUserLoginIdMock.mockReturnValue('user@example.com');

      startMock.mockReturnValueOnce(generateSdkResponse());

      fixtures.pageContent = `
        <descope-attachment id="badge" data-type="last-auth-badge"></descope-attachment>
        <descope-button id="my-button">click</descope-button>
        <span>Loaded</span>
      `;

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(
        () => {
          const shadowRoot = document.querySelector('descope-wc').shadowRoot;
          const badgeEl = shadowRoot.querySelector('descope-attachment');
          expect(badgeEl.querySelector('#my-button')).toBeNull();
        },
        { timeout: WAIT_TIMEOUT },
      );
    });

    it('should not nest the button when there is no entry for the current screen', async () => {
      const loginId = 'user@example.com';
      getLastUserLoginIdMock.mockReturnValue(loginId);

      localStorage.setItem(
        DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
        JSON.stringify({
          authMethod: 'otp',
          loginId,
          lastUsedPerScreen: { 'other-screen': 'my-button' },
        }),
      );

      startMock.mockReturnValueOnce(
        generateSdkResponse({ screenId: 'my-screen' }),
      );

      fixtures.pageContent = `
        <descope-attachment id="badge" data-type="last-auth-badge"></descope-attachment>
        <descope-button id="my-button">click</descope-button>
        <span>Loaded</span>
      `;

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(
        () => {
          const shadowRoot = document.querySelector('descope-wc').shadowRoot;
          const badgeEl = shadowRoot.querySelector('descope-attachment');
          expect(badgeEl.querySelector('#my-button')).toBeNull();
        },
        { timeout: WAIT_TIMEOUT },
      );
    });

    it('should not nest the button when the target component is not in the screen', async () => {
      const loginId = 'user@example.com';
      getLastUserLoginIdMock.mockReturnValue(loginId);

      localStorage.setItem(
        DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
        JSON.stringify({
          authMethod: 'otp',
          loginId,
          lastUsedPerScreen: { '0': 'nonexistent-button' },
        }),
      );

      startMock.mockReturnValueOnce(generateSdkResponse());

      fixtures.pageContent = `
        <descope-attachment id="badge" data-type="last-auth-badge"></descope-attachment>
        <descope-button id="my-button">click</descope-button>
        <span>Loaded</span>
      `;

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(
        () => {
          const shadowRoot = document.querySelector('descope-wc').shadowRoot;
          const badgeEl = shadowRoot.querySelector('descope-attachment');
          expect(badgeEl.querySelector('#my-button')).toBeNull();
        },
        { timeout: WAIT_TIMEOUT },
      );
    });
  });
});
