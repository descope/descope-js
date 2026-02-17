/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  nextMock,
  fixtures,
  fetchMock,
  getLastUserLoginIdMock,
  defaultOptionsValues,
  WAIT_TIMEOUT,
  generateSdkResponse,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { fireEvent, waitFor } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

import {
  ASSETS_FOLDER,
  DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
  URL_CODE_PARAM_NAME,
  URL_TOKEN_PARAM_NAME,
  URL_REDIRECT_AUTH_CALLBACK_PARAM_NAME,
  URL_REDIRECT_AUTH_BACKUP_CALLBACK_PARAM_NAME,
  URL_REDIRECT_AUTH_CHALLENGE_PARAM_NAME,
  URL_REDIRECT_AUTH_INITIATOR_PARAM_NAME,
  OIDC_IDP_STATE_ID_PARAM_NAME,
  SAML_IDP_STATE_ID_PARAM_NAME,
  SAML_IDP_USERNAME_PARAM_NAME,
  DESCOPE_IDP_INITIATED_PARAM_NAME,
  SSO_APP_ID_PARAM_NAME,
} from '../src/lib/constants';

describe('web-component', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  describe('condition', () => {
    beforeEach(() => {
      localStorage.removeItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY);
    });
    it('Should fetch met screen when condition is met', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      localStorage.setItem(
        DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
        '{"authMethod":"otp"}',
      );
      getLastUserLoginIdMock.mockReturnValue('abc');

      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          'sign-in': {
            condition: {
              key: 'lastAuth.loginId',
              met: {
                interactionId: 'gbutpyzvtgs',
                screenId: 'met',
              },
              operator: 'not-empty',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
          },
        },
      };

      fixtures.pageContent = '<div>hey</div>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('hey'), {
        timeout: WAIT_TIMEOUT,
      });
      expect(startMock).not.toBeCalled();
      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/met.html`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object),
      );
    });

    it('Should fetch unmet screen when condition is not met', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      localStorage.setItem(
        DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
        '{"authMethod":"otp"}',
      );

      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          'sign-in': {
            condition: {
              key: 'lastAuth.loginId',
              met: {
                interactionId: 'gbutpyzvtgs',
                screenId: 'met',
              },
              operator: 'not-empty',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
          },
        },
      };

      fixtures.pageContent = '<div>hey</div>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('hey'), {
        timeout: WAIT_TIMEOUT,
      });
      expect(startMock).not.toBeCalled();
      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/unmet.html`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object),
      );
    });

    it('Should send condition interaction ID on submit click', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      localStorage.setItem(
        DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
        '{"authMethod":"otp"}',
      );
      getLastUserLoginIdMock.mockReturnValue('abc');

      const conditionInteractionId = 'gbutpyzvtgs';
      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          'sign-in': {
            condition: {
              key: 'lastAuth.loginId',
              met: {
                interactionId: conditionInteractionId,
                screenId: 'met',
              },
              operator: 'not-empty',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
            version: 1,
          },
        },
      };

      fixtures.pageContent = `<descope-button type="button" id="interactionId">Click</descope-button>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.findByShadowText('Click'), {
        timeout: WAIT_TIMEOUT,
      });

      fixtures.pageContent =
        '<input id="email"></input><input id="code"></input><span>It works!</span>';

      fireEvent.click(screen.getByShadowText('Click'));

      await waitFor(() =>
        expect(startMock).toBeCalledWith(
          'sign-in',
          {
            ...defaultOptionsValues,
            lastAuth: { authMethod: 'otp' },
            preview: false,
          },
          conditionInteractionId,
          'interactionId',
          '1.2.3',
          {
            'sign-in': 1,
          },
          { origin: 'http://localhost' },
          false,
        ),
      );
    });
    it('Should call start with code and idpInitiated when idpInitiated condition is met', async () => {
      window.location.search = `?${URL_CODE_PARAM_NAME}=code1`;
      localStorage.setItem(
        DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
        '{"authMethod":"otp"}',
      );
      getLastUserLoginIdMock.mockReturnValue('abc');
      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          'sign-in': {
            condition: {
              key: 'idpInitiated',
              met: {
                interactionId: 'gbutpyzvtgs',
              },
              operator: 'not-empty',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
            version: 1,
          },
        },
      };

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;
      await waitFor(
        () =>
          expect(startMock).toHaveBeenCalledWith(
            'sign-in',
            {
              ...defaultOptionsValues,
              lastAuth: { authMethod: 'otp' },
            },
            undefined,
            '',
            '1.2.3',
            {
              'sign-in': 1,
            },
            {
              exchangeCode: 'code1',
              idpInitiated: true,
            },
          ),
        { timeout: WAIT_TIMEOUT },
      );
    });

    it('Should fetch unmet screen when idpInitiated condition is not met', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          'sign-in': {
            condition: {
              key: 'idpInitiated',
              met: {
                interactionId: 'gbutpyzvtgs',
              },
              operator: 'is-true',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
          },
        },
      };

      fixtures.pageContent = '<div>hey</div>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('hey'), {
        timeout: WAIT_TIMEOUT,
      });
      expect(startMock).not.toBeCalled();
      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/unmet.html`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object),
      );
    });

    it('Should call start with token and externalToken when externalToken condition is met', async () => {
      window.location.search = `?${URL_TOKEN_PARAM_NAME}=code1`;
      localStorage.setItem(
        DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
        '{"authMethod":"otp"}',
      );
      getLastUserLoginIdMock.mockReturnValue('abc');
      fixtures.configContent = {
        flows: {
          'sign-in': {
            condition: {
              key: 'externalToken',
              met: {
                interactionId: 'gbutpyzvtgs',
              },
              operator: 'not-empty',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
            version: 1,
          },
        },
      };

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;
      await waitFor(
        () =>
          expect(startMock).toHaveBeenCalledWith(
            'sign-in',
            {
              ...defaultOptionsValues,
              lastAuth: { authMethod: 'otp' },
            },
            undefined,
            '',
            undefined,
            {
              'sign-in': 1,
            },
            {
              token: 'code1',
            },
          ),
        { timeout: WAIT_TIMEOUT },
      );
    });

    it('Should fetch unmet screen when externalToken condition is not met', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      fixtures.configContent = {
        flows: {
          'sign-in': {
            condition: {
              key: 'externalToken',
              met: {
                interactionId: 'gbutpyzvtgs',
              },
              operator: 'is-true',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
          },
        },
      };

      fixtures.pageContent = '<div>hey</div>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('hey'), {
        timeout: WAIT_TIMEOUT,
      });
      expect(startMock).not.toBeCalled();
      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/unmet.html`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object),
      );
    });

    it('should call start with redirect auth data and keep it in the url', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      fixtures.pageContent = '<span>It works!</span>';
      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          'sign-in': { version: 0 },
        },
      };
      const challenge = window.btoa('hash');
      const callback = 'https://mycallback.com';
      const backupCallback = 'myapp://auth';
      const encodedChallenge = encodeURIComponent(challenge);
      const encodedCallback = encodeURIComponent(callback);
      const encodedBackupCallback = encodeURIComponent(backupCallback);
      const redirectAuthQueryParams = `?${URL_REDIRECT_AUTH_CHALLENGE_PARAM_NAME}=${encodedChallenge}&${URL_REDIRECT_AUTH_CALLBACK_PARAM_NAME}=${encodedCallback}&${URL_REDIRECT_AUTH_BACKUP_CALLBACK_PARAM_NAME}=${encodedBackupCallback}&${URL_REDIRECT_AUTH_INITIATOR_PARAM_NAME}=android`;
      window.location.search = redirectAuthQueryParams;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(
        () =>
          expect(startMock).toHaveBeenCalledWith(
            'sign-in',
            {
              ...defaultOptionsValues,
              redirectAuth: {
                callbackUrl: callback,
                codeChallenge: challenge,
                backupCallbackUri: backupCallback,
              },
            },
            undefined,
            '',
            '1.2.3',
            {
              'sign-in': 0,
            },
            {},
          ),
        { timeout: WAIT_TIMEOUT },
      );
      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: 20000,
      });
      await waitFor(() =>
        expect(window.location.search).toBe(redirectAuthQueryParams),
      );
    });

    it('should call start with redirect auth data and token and keep it in the url', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      fixtures.pageContent = '<span>It works!</span>';
      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          'sign-in': { version: 0 },
        },
      };
      const token = 'token1';
      const challenge = window.btoa('hash');
      const callback = 'https://mycallback.com';
      const encodedChallenge = encodeURIComponent(challenge);
      const encodedCallback = encodeURIComponent(callback);
      const redirectAuthQueryParams = `?${URL_REDIRECT_AUTH_CHALLENGE_PARAM_NAME}=${encodedChallenge}&${URL_REDIRECT_AUTH_CALLBACK_PARAM_NAME}=${encodedCallback}&${URL_REDIRECT_AUTH_INITIATOR_PARAM_NAME}=android`;
      window.location.search = `${redirectAuthQueryParams}&${URL_TOKEN_PARAM_NAME}=${token}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(
        () =>
          expect(startMock).toHaveBeenCalledWith(
            'sign-in',
            {
              ...defaultOptionsValues,
              redirectAuth: {
                callbackUrl: callback,
                codeChallenge: challenge,
                backupCallbackUri: null,
              },
            },
            undefined,
            '',
            '1.2.3',
            {
              'sign-in': 0,
            },
            { token },
          ),
        { timeout: WAIT_TIMEOUT },
      );
      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: 20000,
      });
      await waitFor(() =>
        expect(window.location.search).toBe(redirectAuthQueryParams),
      );
    });

    it('should call start with oidc idp flag and clear it from url', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      fixtures.pageContent = '<span>It works!</span>';
      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          'sign-in': { version: 0 },
        },
      };
      const oidcIdpStateId = 'abcdefgh';
      const encodedOidcIdpStateId = encodeURIComponent(oidcIdpStateId);
      window.location.search = `?${OIDC_IDP_STATE_ID_PARAM_NAME}=${encodedOidcIdpStateId}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(
        () =>
          expect(startMock).toHaveBeenCalledWith(
            'sign-in',
            {
              ...defaultOptionsValues,
              oidcIdpStateId: 'abcdefgh',
            },
            undefined,
            '',
            '1.2.3',
            {
              'sign-in': 0,
            },
            {},
          ),
        { timeout: WAIT_TIMEOUT },
      );
      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: 20000,
      });
      await waitFor(() => expect(window.location.search).toBe(''));
    });

    it('should call start with oidc idp when there is a start screen is configured', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          'sign-in': { startScreenId: 'screen-0' },
        },
      };

      fixtures.pageContent =
        '<descope-button>click</descope-button><span>It works!</span>';

      const oidcIdpStateId = 'abcdefgh';
      const encodedOidcIdpStateId = encodeURIComponent(oidcIdpStateId);
      window.location.search = `?${OIDC_IDP_STATE_ID_PARAM_NAME}=${encodedOidcIdpStateId}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: 20000,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });
    });

    it('should call start with saml idp when there is a start screen is configured', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      fixtures.configContent = {
        flows: {
          'sign-in': { startScreenId: 'screen-0' },
        },
      };

      fixtures.pageContent =
        '<descope-button>click</descope-button><span>It works!</span>';

      const samlIdpStateId = 'abcdefgh';
      const encodedSamlIdpStateId = encodeURIComponent(samlIdpStateId);
      window.location.search = `?${SAML_IDP_STATE_ID_PARAM_NAME}=${encodedSamlIdpStateId}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT * 2,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });
    });

    it('should call start with saml idp with username when there is a start screen is configured', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      fixtures.configContent = {
        flows: {
          'sign-in': { startScreenId: 'screen-0' },
        },
      };

      fixtures.pageContent =
        '<descope-button>click</descope-button><span>It works!</span>';

      const samlIdpUsername = 'abcdefgh';
      const encodedSamlIdpUsername = encodeURIComponent(samlIdpUsername);
      window.location.search = `?${SAML_IDP_USERNAME_PARAM_NAME}=${encodedSamlIdpUsername}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(() => expect(nextMock).toHaveBeenCalled());
    });

    it('should call start with saml idp flag and clear it from url', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      fixtures.pageContent = '<span>It works!</span>';
      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          'sign-in': { version: 0 },
        },
      };
      const samlIdpStateId = 'abcdefgh';
      const encodedSamlIdpStateId = encodeURIComponent(samlIdpStateId);
      window.location.search = `?${SAML_IDP_STATE_ID_PARAM_NAME}=${encodedSamlIdpStateId}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(
        () =>
          expect(startMock).toHaveBeenCalledWith(
            'sign-in',
            {
              ...defaultOptionsValues,
              samlIdpStateId: 'abcdefgh',
            },
            undefined,
            '',
            '1.2.3',
            {
              'sign-in': 0,
            },
            {},
          ),
        { timeout: WAIT_TIMEOUT },
      );
      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });
      await waitFor(() => expect(window.location.search).toBe(''));
    });

    it('should call start with saml idp with username flag and clear it from url', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      fixtures.pageContent = '<span>It works!</span>';
      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          'sign-in': { version: 0 },
        },
      };
      const samlIdpStateId = 'abcdefgh';
      const encodedSamlIdpStateId = encodeURIComponent(samlIdpStateId);
      const samlIdpUsername = 'dummyUser';
      const encodedSamlIdpUsername = encodeURIComponent(samlIdpUsername);
      window.location.search = `?${SAML_IDP_STATE_ID_PARAM_NAME}=${encodedSamlIdpStateId}&${SAML_IDP_USERNAME_PARAM_NAME}=${encodedSamlIdpUsername}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(
        () =>
          expect(startMock).toHaveBeenCalledWith(
            'sign-in',
            {
              ...defaultOptionsValues,
              samlIdpStateId: 'abcdefgh',
              samlIdpUsername: 'dummyUser',
            },
            undefined,
            '',
            '1.2.3',
            {
              'sign-in': 0,
            },
            {},
          ),
        { timeout: WAIT_TIMEOUT },
      );
      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });
      await waitFor(() => expect(window.location.search).toBe(''));
    });

    it('should call start with descope idp initiated flag and clear it from url', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      fixtures.pageContent = '<span>It works!</span>';
      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          'sign-in': { version: 0 },
        },
      };
      const descopeIdpInitiated = 'true';
      window.location.search = `?${DESCOPE_IDP_INITIATED_PARAM_NAME}=${descopeIdpInitiated}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(
        () =>
          expect(startMock).toHaveBeenCalledWith(
            'sign-in',
            {
              ...defaultOptionsValues,
              descopeIdpInitiated: true,
            },
            undefined,
            '',
            '1.2.3',
            {
              'sign-in': 0,
            },
            {
              idpInitiated: true,
            },
          ),
        { timeout: WAIT_TIMEOUT },
      );
      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });
      await waitFor(() => expect(window.location.search).toBe(''));
    });

    it('should call start with ssoAppId when there is a start screen is configured', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      fixtures.configContent = {
        flows: {
          'sign-in': { startScreenId: 'screen-0' },
        },
      };

      fixtures.pageContent =
        '<descope-button>click</descope-button><span>It works!</span>';

      const ssoAppId = 'abcdefgh';
      const encodedSSOAppId = encodeURIComponent(ssoAppId);
      window.location.search = `?${SSO_APP_ID_PARAM_NAME}=${encodedSSOAppId}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });
    });

    it('should call start with ssoAppId flag and clear it from url', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      fixtures.pageContent = '<span>It works!</span>';
      fixtures.configContent = {
        flows: {
          'sign-in': { startScreenId: 'screen-0' },
        },
        componentsVersion: '1.2.3',
      };

      const ssoAppId = 'abcdefgh';
      const encodedSSOAppId = encodeURIComponent(ssoAppId);
      window.location.search = `?${SSO_APP_ID_PARAM_NAME}=${encodedSSOAppId}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(
        () =>
          expect(startMock).toHaveBeenCalledWith(
            'sign-in',
            {
              ...defaultOptionsValues,
              ssoAppId: 'abcdefgh',
            },
            undefined,
            '',
            '1.2.3',
            {
              'sign-in': 0,
            },
            {},
          ),
        { timeout: WAIT_TIMEOUT },
      );
      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });
      await waitFor(() => expect(window.location.search).toBe(''));
    });
  });
});
