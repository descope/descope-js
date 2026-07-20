/* eslint-disable import/order, max-classes-per-file */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  nextMock,
  getLastUserLoginIdMock,
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

  describe('password managers', () => {
    it('should store password in password manager', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

      Object.assign(navigator, { credentials: { store: jest.fn() } });
      globalThis.PasswordCredential = class {
        constructor(obj) {
          Object.assign(this, obj);
        }
      };
      fixtures.pageContent =
        '<descope-button id="submitterId">click</descope-button><input id="email" name="email" value="1@1.com"></input><input id="password" name="password" value="pass"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(
        () =>
          expect(navigator.credentials.store).toHaveBeenCalledWith({
            id: '1@1.com',
            password: 'pass',
          }),
        { timeout: WAIT_TIMEOUT },
      );
    });

    it('should fall back to the authenticated user email when storing credentials without id fields', async () => {
      startMock.mockReturnValueOnce(
        generateSdkResponse({
          screenState: { user: { email: '1@1.com' } },
        }),
      );
      nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

      Object.assign(navigator, { credentials: { store: jest.fn() } });
      globalThis.PasswordCredential = class {
        constructor(obj) {
          Object.assign(this, obj);
        }
      };
      fixtures.pageContent =
        '<descope-button id="submitterId">click</descope-button><input id="new-password" name="newPassword" value="pass"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(
        () =>
          expect(navigator.credentials.store).toHaveBeenCalledWith({
            id: '1@1.com',
            password: 'pass',
          }),
        { timeout: WAIT_TIMEOUT },
      );
    });

    describe('username anchor injection', () => {
      const newPasswordPage =
        '<descope-new-password external-input="true" id="new-password"><input slot="password" type="password"/></descope-new-password><span>It works!</span>';

      // the anchor is expected in the host light DOM, where password manager
      // save heuristics can see it
      const getAnchor = () =>
        document
          .getElementsByTagName('descope-wc')[0]
          .querySelector('input[autocomplete="username"]');

      it('should inject a hidden username anchor when screen has new-password and user email', async () => {
        startMock.mockReturnValueOnce(
          generateSdkResponse({
            screenState: { user: { email: '1@1.com' } },
          }),
        );

        fixtures.pageContent = newPasswordPage;
        document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

        await waitFor(() => screen.getByShadowText('It works!'), {
          timeout: WAIT_TIMEOUT,
        });

        await waitFor(
          () => {
            const anchor = getAnchor();
            expect(anchor).not.toBeNull();
            expect(anchor).toHaveValue('1@1.com');
            expect(anchor).toHaveAttribute('readonly');
            expect(anchor).not.toHaveAttribute('type', 'hidden');
            expect(anchor).toHaveStyle({ opacity: '0' });
            // injected into the host light DOM, visible to password managers
            expect(anchor.parentElement).toBe(
              document.getElementsByTagName('descope-wc')[0],
            );
          },
          { timeout: WAIT_TIMEOUT },
        );
      });

      it('should inject a username anchor from an identifier submitted on a previous screen', async () => {
        startMock.mockReturnValueOnce(generateSdkResponse());
        nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

        fixtures.pageContent = `<descope-button id="submitterId">click</descope-button><input id="email" name="email" value="typed@user.com"></input>${newPasswordPage}`;
        document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

        await waitFor(() => screen.getByShadowText('It works!'), {
          timeout: WAIT_TIMEOUT,
        });

        // no identifier is known on the first screen
        expect(getAnchor()).toBeNull();

        fireEvent.click(screen.getByShadowText('click'));

        await waitFor(() => expect(getAnchor()).toHaveValue('typed@user.com'), {
          timeout: WAIT_TIMEOUT,
        });
      });

      it('should inject a username anchor from the last authenticated user when flow state has no user', async () => {
        startMock.mockReturnValueOnce(generateSdkResponse());
        getLastUserLoginIdMock.mockReturnValue('last@user.com');

        fixtures.pageContent = newPasswordPage;
        document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

        await waitFor(() => screen.getByShadowText('It works!'), {
          timeout: WAIT_TIMEOUT,
        });

        await waitFor(() => expect(getAnchor()).toHaveValue('last@user.com'), {
          timeout: WAIT_TIMEOUT,
        });
      });

      it('should inject a username anchor for a password component without an identifier input', async () => {
        startMock.mockReturnValueOnce(
          generateSdkResponse({
            screenState: { user: { email: '1@1.com' } },
          }),
        );

        fixtures.pageContent =
          '<descope-password id="password"></descope-password><span>It works!</span>';
        document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

        await waitFor(() => screen.getByShadowText('It works!'), {
          timeout: WAIT_TIMEOUT,
        });

        await waitFor(() => expect(getAnchor()).toHaveValue('1@1.com'), {
          timeout: WAIT_TIMEOUT,
        });
      });

      it('should not use an identifier submitted in a different flow execution', async () => {
        startMock.mockReturnValueOnce(generateSdkResponse());
        sessionStorage.setItem(
          'dls_last_submitted_login_id',
          JSON.stringify({
            executionId: 'some-other-execution',
            loginId: 'stale@user.com',
          }),
        );

        fixtures.pageContent = newPasswordPage;
        document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

        await waitFor(() => screen.getByShadowText('It works!'), {
          timeout: WAIT_TIMEOUT,
        });

        const rootEle = document.getElementsByTagName('descope-wc')[0];

        await waitFor(
          () =>
            expect(
              rootEle.querySelector('input[type="password"]'),
            ).not.toBeNull(),
          { timeout: WAIT_TIMEOUT },
        );

        expect(getAnchor()).toBeNull();
      });

      it('should not inject a username anchor when there is no authenticated user', async () => {
        startMock.mockReturnValueOnce(generateSdkResponse());

        fixtures.pageContent = newPasswordPage;
        document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

        await waitFor(() => screen.getByShadowText('It works!'), {
          timeout: WAIT_TIMEOUT,
        });

        const rootEle = document.getElementsByTagName('descope-wc')[0];

        // wait for the external input to be slotted, which happens in the same tick
        // as the (potential) anchor injection
        await waitFor(
          () =>
            expect(
              rootEle.querySelector('input[type="password"]'),
            ).not.toBeNull(),
          { timeout: WAIT_TIMEOUT },
        );

        expect(getAnchor()).toBeNull();
      });

      it('should not inject a username anchor when the screen already has one', async () => {
        startMock.mockReturnValueOnce(
          generateSdkResponse({
            screenState: { user: { email: '1@1.com' } },
          }),
        );

        fixtures.pageContent = `<div external-input="true" id="email"><input slot="email" autocomplete="username" type="email"/></div>${newPasswordPage}`;
        document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

        await waitFor(() => screen.getByShadowText('It works!'), {
          timeout: WAIT_TIMEOUT,
        });

        const rootEle = document.getElementsByTagName('descope-wc')[0];

        await waitFor(
          () =>
            expect(
              rootEle.querySelector('input[type="password"]'),
            ).not.toBeNull(),
          { timeout: WAIT_TIMEOUT },
        );

        // the screen's own username input is the only one, no anchor injected
        expect(
          rootEle.querySelectorAll('input[autocomplete="username"]'),
        ).toHaveLength(1);
      });
    });
  });
});
