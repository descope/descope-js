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

import { DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY } from '../src/lib/constants';

class DescopeLastAuthBadge extends HTMLElement {}
if (!customElements.get('descope-last-auth-badge')) {
  customElements.define('descope-last-auth-badge', DescopeLastAuthBadge);
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
          expect(lastAuth.lastUsedPerScreen?.['screen-1']).toBe('my-button');
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
        '<descope-button id="button-a">click a</descope-button><descope-button id="button-b">click b</descope-button><span>Loaded</span>';

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
    it('should set the badge anchor to the last used button for the current screen', async () => {
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
        <descope-last-auth-badge id="badge"></descope-last-auth-badge>
        <descope-button id="my-button" opt-in-last-used="true">click</descope-button>
        <span>Loaded</span>
      `;

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(
        () => {
          const shadowRoot = document.querySelector('descope-wc').shadowRoot;
          const badgeEl = shadowRoot.querySelector('descope-last-auth-badge');
          const buttonEl = shadowRoot.querySelector('#my-button');
          expect(badgeEl.anchor).toBe(buttonEl);
        },
        { timeout: WAIT_TIMEOUT },
      );
    });

    it('should not set the badge anchor when the target component is missing opt-in-last-used', async () => {
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
        <descope-last-auth-badge id="badge"></descope-last-auth-badge>
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
          const badgeEl = shadowRoot.querySelector('descope-last-auth-badge');
          expect(badgeEl.anchor).toBeUndefined();
        },
        { timeout: WAIT_TIMEOUT },
      );
    });

    it('should not set the badge anchor when no lastUsedPerScreen in localStorage', async () => {
      getLastUserLoginIdMock.mockReturnValue('user@example.com');

      startMock.mockReturnValueOnce(generateSdkResponse());

      fixtures.pageContent = `
        <descope-last-auth-badge id="badge"></descope-last-auth-badge>
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
          const badgeEl = shadowRoot.querySelector('descope-last-auth-badge');
          expect(badgeEl.anchor).toBeUndefined();
        },
        { timeout: WAIT_TIMEOUT },
      );
    });

    it('should not set the badge anchor when there is no entry for the current screen', async () => {
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
        <descope-last-auth-badge id="badge"></descope-last-auth-badge>
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
          const badgeEl = shadowRoot.querySelector('descope-last-auth-badge');
          expect(badgeEl.anchor).toBeUndefined();
        },
        { timeout: WAIT_TIMEOUT },
      );
    });

    it('should not set the badge anchor when the target component is not in the screen', async () => {
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
        <descope-last-auth-badge id="badge"></descope-last-auth-badge>
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
          const badgeEl = shadowRoot.querySelector('descope-last-auth-badge');
          expect(badgeEl.anchor).toBeUndefined();
        },
        { timeout: WAIT_TIMEOUT },
      );
    });
  });
});
