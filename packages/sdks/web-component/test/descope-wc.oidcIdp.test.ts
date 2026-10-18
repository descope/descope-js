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
import { resetInitializedScopes } from '../src/lib/helpers/oidcSession';

import {
  ASSETS_FOLDER,
  DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
  URL_CODE_PARAM_NAME,
  OIDC_IDP_STATE_ID_PARAM_NAME,
  OIDC_LOGIN_HINT_PARAM_NAME,
  OIDC_PROMPT_PARAM_NAME,
  OIDC_ERROR_REDIRECT_URI_PARAM_NAME,
  OIDC_RESOURCE_PARAM_NAME,
  THIRD_PARTY_APP_STATE_ID_PARAM_NAME,
  APPLICATION_SCOPES_PARAM_NAME,
  SSO_APP_ID_PARAM_NAME,
  URL_RUN_IDS_PARAM_NAME,
  DESCOPE_SSO_QUERY_PARAMS_SESSION_STORAGE_KEY_PREFIX,
  HAS_DYNAMIC_VALUES_ATTR_NAME,
} from '../src/lib/constants';

// the storage key carries the project and flow
const ssoKey = (projectId = '1', flowId = 'sign-in') =>
  `${DESCOPE_SSO_QUERY_PARAMS_SESSION_STORAGE_KEY_PREFIX}_${projectId}_${flowId}`;

describe('web-component', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  it('should call start with oidc idp with oidcLoginHint flag and clear it from url', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.pageContent = '<span>It works!</span>';

    const oidcStateId = 'abcdefgh';
    const encodedOidcStateId = encodeURIComponent(oidcStateId);
    const oidcLoginHint = 'dummyUser';
    const encodedOidcLoginHint = encodeURIComponent(oidcLoginHint);
    window.location.search = `?${OIDC_IDP_STATE_ID_PARAM_NAME}=${encodedOidcStateId}&${OIDC_LOGIN_HINT_PARAM_NAME}=${encodedOidcLoginHint}`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(startMock).toHaveBeenCalledWith(
          'sign-in',
          {
            ...defaultOptionsValues,
            oidcIdpStateId: 'abcdefgh',
            oidcLoginHint: 'dummyUser',
          },
          undefined,
          '',
          '1.2.3',
          {
            otpSignInEmail: 1,
            'versioned-flow': 1,
          },
          {
            externalId: 'dummyUser',
          },
        ),
      { timeout: WAIT_TIMEOUT },
    );
    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(() => expect(window.location.search).toBe(''));
  });

  it('should call start with oidc idp with loginHint when there is a start screen is configured', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.configContent = {
      flows: {
        'sign-in': { startScreenId: 'screen-0' },
      },
    };

    fixtures.pageContent =
      '<descope-button>click</descope-button><span>It works!</span>';

    const oidcLoginHint = 'abcdefgh';
    const encodedOidcLoginHint = encodeURIComponent(oidcLoginHint);
    window.location.search = `?${OIDC_LOGIN_HINT_PARAM_NAME}=${encodedOidcLoginHint}`;
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

  it('should call start with oidc idp with oidcPrompt flag and clear it from url', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.pageContent = '<span>It works!</span>';

    const oidcStateId = 'abcdefgh';
    const encodedOidcStateId = encodeURIComponent(oidcStateId);
    const oidcPrompt = 'login';
    const encodedOidcPrompt = encodeURIComponent(oidcPrompt);
    window.location.search = `?${OIDC_IDP_STATE_ID_PARAM_NAME}=${encodedOidcStateId}&${OIDC_PROMPT_PARAM_NAME}=${encodedOidcPrompt}`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(startMock).toHaveBeenCalledWith(
          'sign-in',
          {
            ...defaultOptionsValues,
            oidcIdpStateId: 'abcdefgh',
            oidcPrompt: 'login',
          },
          undefined,
          '',
          '1.2.3',
          {
            otpSignInEmail: 1,
            'versioned-flow': 1,
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

  it('should call start with oidc idp with oidcPrompt when there is a start screen is configured', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.configContent = {
      flows: {
        'sign-in': { startScreenId: 'screen-0' },
      },
    };

    fixtures.pageContent =
      '<descope-button>click</descope-button><span>It works!</span>';

    const oidcPrompt = 'login';
    const encodedOidcPrompt = encodeURIComponent(oidcPrompt);
    window.location.search = `?${OIDC_PROMPT_PARAM_NAME}=${encodedOidcPrompt}`;
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

  it('should call start with oidc idp with oidcErrorRedirectUri flag and clear it from url', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.pageContent = '<span>It works!</span>';

    const oidcStateId = 'abcdefgh';
    const encodedOidcStateId = encodeURIComponent(oidcStateId);
    const oidcErrorRedirectUri = 'https://some.test';
    const encodedOidcErrorRedirectUri =
      encodeURIComponent(oidcErrorRedirectUri);
    window.location.search = `?${OIDC_IDP_STATE_ID_PARAM_NAME}=${encodedOidcStateId}&${OIDC_ERROR_REDIRECT_URI_PARAM_NAME}=${encodedOidcErrorRedirectUri}`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(startMock).toHaveBeenCalledWith(
          'sign-in',
          {
            ...defaultOptionsValues,
            oidcIdpStateId: 'abcdefgh',
            oidcErrorRedirectUri: 'https://some.test',
          },
          undefined,
          '',
          '1.2.3',
          {
            otpSignInEmail: 1,
            'versioned-flow': 1,
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

  it('should call start with oidc idp with oidcErrorRedirectUri when there is a start screen is configured', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.configContent = {
      flows: {
        'sign-in': { startScreenId: 'screen-0' },
      },
    };

    fixtures.pageContent =
      '<descope-button>click</descope-button><span>It works!</span>';

    const oidcErrorRedirectUri = 'https://some.test';
    const encodedOidcErrorRedirectUri =
      encodeURIComponent(oidcErrorRedirectUri);
    window.location.search = `?${OIDC_ERROR_REDIRECT_URI_PARAM_NAME}=${encodedOidcErrorRedirectUri}`;
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

  it('should call start with oidc idp with oidcResource flag and clear it from url', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.pageContent = '<span>It works!</span>';

    const oidcStateId = 'abcdefgh';
    const encodedOidcStateId = encodeURIComponent(oidcStateId);
    const oidcResource = 'https://api.example.com';
    const encodedOidcResource = encodeURIComponent(oidcResource);
    window.location.search = `?${OIDC_IDP_STATE_ID_PARAM_NAME}=${encodedOidcStateId}&${OIDC_RESOURCE_PARAM_NAME}=${encodedOidcResource}`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(startMock).toHaveBeenCalledWith(
          'sign-in',
          {
            ...defaultOptionsValues,
            oidcIdpStateId: 'abcdefgh',
            oidcResource: 'https://api.example.com',
          },
          undefined,
          '',
          '1.2.3',
          {
            otpSignInEmail: 1,
            'versioned-flow': 1,
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

  it('should call start with oidc idp with oidcResource when there is a start screen is configured', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.configContent = {
      flows: {
        'sign-in': { startScreenId: 'screen-0' },
      },
    };

    fixtures.pageContent =
      '<descope-button>click</descope-button><span>It works!</span>';

    const oidcResource = 'https://api.example.com';
    const encodedOidcResource = encodeURIComponent(oidcResource);
    window.location.search = `?${OIDC_RESOURCE_PARAM_NAME}=${encodedOidcResource}`;
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

  it('Should call start with code and idpInitiated when idpInitiated condition is met in multiple conditions', async () => {
    window.location.search = `?${URL_CODE_PARAM_NAME}=code1`;
    fixtures.configContent = {
      ...fixtures.configContent,
      flows: {
        'sign-in': {
          conditions: [
            {
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
          ],
          version: 1,
        },
      },
    };

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;
    await waitFor(
      () =>
        expect(startMock).toHaveBeenCalledWith(
          'sign-in',
          defaultOptionsValues,
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

  it('Should call start with code and idpInitiated when idpInitiated condition is met in multiple conditions with last auth', async () => {
    window.location.search = `?${URL_CODE_PARAM_NAME}=code1`;
    fixtures.configContent = {
      ...fixtures.configContent,
      flows: {
        'sign-in': {
          conditions: [
            {
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
            {
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
          ],
          version: 1,
        },
      },
    };

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;
    await waitFor(
      () =>
        expect(startMock).toHaveBeenCalledWith(
          'sign-in',
          defaultOptionsValues,
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

  it('should call start with third party application stateId and clear it from url', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.pageContent = '<span>It works!</span>';
    fixtures.configContent = {
      ...fixtures.configContent,
      flows: {
        'sign-in': { version: 0 },
      },
    };
    const thirdPartyAppStateId = 'abcdefgh';
    const encodedThirdPartyAppStateId =
      encodeURIComponent(thirdPartyAppStateId);
    window.location.search = `?${THIRD_PARTY_APP_STATE_ID_PARAM_NAME}=${encodedThirdPartyAppStateId}`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(startMock).toHaveBeenCalledWith(
          'sign-in',
          {
            ...defaultOptionsValues,
            thirdPartyAppStateId: 'abcdefgh',
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

  it('should call start with application scopes info and clear it from url', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.pageContent = '<span>It works!</span>';
    fixtures.configContent = {
      ...fixtures.configContent,
      flows: {
        'sign-in': { version: 0 },
      },
    };
    const applicationScopes = 'openid profile email';
    const encodedApplicationScopes = encodeURIComponent(applicationScopes);
    window.location.search = `?${APPLICATION_SCOPES_PARAM_NAME}=${encodedApplicationScopes}`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(startMock).toHaveBeenCalledWith(
          'sign-in',
          {
            ...defaultOptionsValues,
            applicationScopes: 'openid profile email',
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

  it('Should fetch met screen when second condition is met (also checks conditions with predicates)', async () => {
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
          conditions: [
            {
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
            {
              key: 'abTestingKey',
              met: {
                interactionId: 'gbutpyzvtgs',
                screenId: 'met',
              },
              operator: 'greater-than',
              predicate: 21,
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
          ],
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

  it('Should fetch else screen when else is met', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    localStorage.setItem(
      DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
      '{"authMethod":"otp"}',
    );
    getLastUserLoginIdMock.mockReturnValue('');

    fixtures.configContent = {
      ...fixtures.configContent,
      flows: {
        'sign-in': {
          conditions: [
            {
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
            {
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
            {
              key: 'ELSE',
              met: {
                interactionId: '123123',
                screenId: 'else',
              },
            },
          ],
        },
      },
    };

    fixtures.pageContent = '<div>hey</div>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('hey'), {
      timeout: WAIT_TIMEOUT,
    });
    expect(startMock).not.toBeCalled();
    const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/else.html`;

    const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(htmlUrlPathRegex),
      expect.any(Object),
    );
  });

  it('should call the success cb when flow in completed status', async () => {
    fixtures.pageContent = '<input id="email" name="email"></input>';

    startMock.mockReturnValue(
      generateSdkResponse({
        ok: true,
        status: 'completed',
      }),
    );

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id=1></descope-wc>`;

    const wcEle = document.querySelector('descope-wc');

    const onSuccess = jest.fn();

    wcEle.addEventListener('success', onSuccess);

    await waitFor(
      () =>
        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({ detail: { refreshJwt: 'refreshJwt' } }),
        ),
      { timeout: WAIT_TIMEOUT },
    );

    wcEle.removeEventListener('success', onSuccess);
  });

  it('should not store last auth when use last authenticated user is false', async () => {
    localStorage.removeItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY);

    fixtures.pageContent = '<input id="email" name="email"></input>';

    startMock.mockReturnValue(
      generateSdkResponse({
        ok: true,
        status: 'completed',
        lastAuth: { authMethod: 'otp' },
      }),
    );

    document.body.innerHTML = `<h1>Custom element test</h1>
      <descope-wc flow-id="otpSignInEmail" project-id=1 store-last-authenticated-user="false">
    </descope-wc>`;

    const wcEle = document.querySelector('descope-wc');

    const onSuccess = jest.fn();

    wcEle.addEventListener('success', onSuccess);

    await waitFor(
      () =>
        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({ detail: { refreshJwt: 'refreshJwt' } }),
        ),
      { timeout: WAIT_TIMEOUT },
    );

    expect(
      localStorage.getItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY),
    ).toBeNull();
  });

  it('should not store last auth when use last authenticated user is true', async () => {
    localStorage.removeItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY);

    fixtures.pageContent = '<input id="email" name="email"></input>';

    startMock.mockReturnValue(
      generateSdkResponse({
        ok: true,
        status: 'completed',
        lastAuth: { authMethod: 'otp' },
      }),
    );

    document.body.innerHTML = `<h1>Custom element test</h1>
      <descope-wc flow-id="otpSignInEmail" project-id=1 store-last-authenticated-user="true">
    </descope-wc>`;

    const wcEle = document.querySelector('descope-wc');

    const onSuccess = jest.fn();

    wcEle.addEventListener('success', onSuccess);

    await waitFor(
      () =>
        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({ detail: { refreshJwt: 'refreshJwt' } }),
        ),
      { timeout: WAIT_TIMEOUT },
    );

    expect(localStorage.getItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY)).toEqual(
      `{"authMethod":"otp","lastUsedPerScreen":{}}`,
    );
  });

  it('should store last auth when use last authenticated', async () => {
    localStorage.removeItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY);

    fixtures.pageContent = '<input id="email" name="email"></input>';

    startMock.mockReturnValue(
      generateSdkResponse({
        ok: true,
        status: 'completed',
        lastAuth: { authMethod: 'otp', loginId: 'moshe' },
      }),
    );

    document.body.innerHTML = `<h1>Custom element test</h1>
      <descope-wc flow-id="otpSignInEmail" project-id=1>
    </descope-wc>`;

    const wcEle = document.querySelector('descope-wc');

    const onSuccess = jest.fn();

    wcEle.addEventListener('success', onSuccess);

    await waitFor(
      () =>
        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({ detail: { refreshJwt: 'refreshJwt' } }),
        ),
      { timeout: WAIT_TIMEOUT },
    );

    expect(localStorage.getItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY)).toEqual(
      `{"authMethod":"otp","loginId":"moshe","lastUsedPerScreen":{}}`,
    );
  });

  it('should store last auth when use last authenticated not completed status with login id', async () => {
    localStorage.removeItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY);

    fixtures.pageContent = '<div>hey</div>';

    startMock.mockReturnValue(
      generateSdkResponse({
        ok: true,
        status: 'waiting',
        lastAuth: { authMethod: 'otp', loginId: 'moshe' },
      }),
    );

    document.body.innerHTML = `<h1>Custom element test</h1>
      <descope-wc flow-id="otpSignInEmail" project-id=1>
    </descope-wc>`;

    await waitFor(() => screen.getByShadowText('hey'), {
      timeout: WAIT_TIMEOUT,
    });

    expect(localStorage.getItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY)).toEqual(
      `{"authMethod":"otp","loginId":"moshe"}`,
    );
  });

  it('should store last auth when use last authenticated not completed status and no login id', async () => {
    localStorage.removeItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY);

    fixtures.pageContent = '<div>hey</div>';

    startMock.mockReturnValue(
      generateSdkResponse({
        ok: true,
        status: 'waiting',
        lastAuth: { authMethod: 'otp' },
      }),
    );

    document.body.innerHTML = `<h1>Custom element test</h1>
      <descope-wc flow-id="otpSignInEmail" project-id=1>
    </descope-wc>`;

    await waitFor(() => screen.getByShadowText('hey'), {
      timeout: WAIT_TIMEOUT,
    });

    expect(
      localStorage.getItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY),
    ).toBeNull();
  });

  it('should pass flow output into the on success event', async () => {
    fixtures.pageContent = '<input id="email" name="email"></input>';

    startMock.mockReturnValue(
      generateSdkResponse({
        ok: true,
        status: 'completed',
        output: { customKey: 'customValue' },
      }),
    );

    document.body.innerHTML = `<h1>Custom element test</h1>
      <descope-wc flow-id="otpSignInEmail" project-id=1>
    </descope-wc>`;

    const wcEle = document.querySelector('descope-wc');

    const onSuccess = jest.fn();

    wcEle.addEventListener('success', onSuccess);

    await waitFor(
      () =>
        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: {
              refreshJwt: 'refreshJwt',
              flowOutput: { customKey: 'customValue' },
            },
          }),
        ),
      { timeout: WAIT_TIMEOUT },
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

  describe('oidc params surviving a page refresh', () => {
    // jsdom has no navigation timing, so it has to be defined rather than spied.
    // Leaving it undefined is the fail-closed case every other test in this file
    // runs under, which is why none of them change behaviour.
    // `name` is the URL the document was loaded from. A reload entry without it
    // is treated as not-a-reload, so it has to be set for these to be realistic.
    const setNavigationType = (type: string | null, name?: string) => {
      Object.defineProperty(window.performance, 'getEntriesByType', {
        configurable: true,
        writable: true,
        value: jest
          .fn()
          .mockReturnValue(
            type ? [{ type, name: name ?? window.location.href }] : [],
          ),
      });
    };

    const mount = (flowId = 'sign-in') => {
      document.body.innerHTML = `<descope-wc flow-id="${flowId}" project-id="1"></descope-wc>`;
    };

    const startOptions = (callIdx: number) => startMock.mock.calls[callIdx][1];

    afterEach(() => {
      delete (window.performance as any).getEntriesByType;
    });

    it('restores the params on a reload, and never writes them back to the url', async () => {
      startMock.mockReturnValue(generateSdkResponse());
      fixtures.pageContent = '<span>It works!</span>';

      window.location.search = `?${OIDC_IDP_STATE_ID_PARAM_NAME}=abcdefgh&${SSO_APP_ID_PARAM_NAME}=app1`;
      mount();

      await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1), {
        timeout: WAIT_TIMEOUT,
      });
      expect(startOptions(0)).toEqual(
        expect.objectContaining({
          oidcIdpStateId: 'abcdefgh',
          ssoAppId: 'app1',
        }),
      );
      await waitFor(() => expect(window.location.search).toBe(''));

      // the refresh: same page, empty url, navigation type reload
      document.body.innerHTML = '';
      // a real refresh builds a new document, which resets the per-document
      // reload credit. the SPA remount test below deliberately omits this.
      resetInitializedScopes();
      setNavigationType('reload');
      mount();

      await waitFor(() => expect(startMock).toHaveBeenCalledTimes(2), {
        timeout: WAIT_TIMEOUT,
      });
      expect(startOptions(1)).toEqual(
        expect.objectContaining({
          oidcIdpStateId: 'abcdefgh',
          ssoAppId: 'app1',
        }),
      );
      // restoring must not put state_id back into the address bar
      expect(window.location.search).toBe('');
    });

    it('does not restore on a normal navigation', async () => {
      startMock.mockReturnValue(generateSdkResponse());
      fixtures.pageContent = '<span>It works!</span>';

      window.location.search = `?${OIDC_IDP_STATE_ID_PARAM_NAME}=abcdefgh`;
      mount();
      await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1), {
        timeout: WAIT_TIMEOUT,
      });

      document.body.innerHTML = '';
      setNavigationType('navigate');
      mount();

      await waitFor(() => expect(startMock).toHaveBeenCalledTimes(2), {
        timeout: WAIT_TIMEOUT,
      });
      expect(startOptions(1).oidcIdpStateId).toBeNull();
    });

    // the guard from the second review: another flow's run ids in the url means
    // a flow already in progress, not the empty-url refresh this is for
    it('does not restore when the url carries another flow run id', async () => {
      startMock.mockReturnValue(generateSdkResponse());
      fixtures.pageContent = '<span>It works!</span>';

      window.location.search = `?${OIDC_IDP_STATE_ID_PARAM_NAME}=abcdefgh`;
      mount();
      await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1), {
        timeout: WAIT_TIMEOUT,
      });

      document.body.innerHTML = '';
      setNavigationType('reload');
      // has to be a well formed value, otherwise executionFlowId comes out empty
      // and the guard would pass for the wrong reason
      window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=${encodeURIComponent(
        'other-flow|#|exec1',
      )}_1`;
      mount();

      await waitFor(() => expect(startMock).toHaveBeenCalledTimes(2), {
        timeout: WAIT_TIMEOUT,
      });
      // handleUrlParams returns an empty object on its flow-mismatch early
      // return, so the key is absent rather than null. What matters is that the
      // stored value did not come back.
      expect(startOptions(1).oidcIdpStateId).not.toBe('abcdefgh');
      expect(startOptions(1).oidcIdpStateId ?? null).toBeNull();
    });

    // with sso params present the component calls start instead of painting the
    // configured first screen, so a restored refresh has to behave like the
    // original load and not like a plain one
    it('calls start on a reload even when a start screen is configured', async () => {
      startMock.mockReturnValue(generateSdkResponse());
      fixtures.configContent = {
        flows: { 'sign-in': { startScreenId: 'screen-0' } },
      };
      fixtures.pageContent = '<span>It works!</span>';

      window.location.search = `?${OIDC_IDP_STATE_ID_PARAM_NAME}=abcdefgh`;
      mount();
      await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1), {
        timeout: WAIT_TIMEOUT,
      });

      document.body.innerHTML = '';
      // a real refresh builds a new document, which resets the per-document
      // reload credit. the SPA remount test below deliberately omits this.
      resetInitializedScopes();
      setNavigationType('reload');
      mount();

      await waitFor(() => expect(startMock).toHaveBeenCalledTimes(2), {
        timeout: WAIT_TIMEOUT,
      });
      expect(startOptions(1).oidcIdpStateId).toBe('abcdefgh');
    });

    // the hole Shuni found on PR #1514. One crafted link used to plant a
    // state_id that survived a clean visit, so a later refresh of a legitimate
    // login on the same page completed the attacker's authorize request.
    it('a crafted link then a refresh of a clean visit restores nothing', async () => {
      startMock.mockReturnValue(generateSdkResponse());
      fixtures.pageContent = '<span>It works!</span>';

      // 1. the victim opens the crafted link once
      window.location.search = `?${OIDC_IDP_STATE_ID_PARAM_NAME}=attacker-state`;
      mount();
      await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1), {
        timeout: WAIT_TIMEOUT,
      });
      expect(startOptions(0).oidcIdpStateId).toBe('attacker-state');
      expect(sessionStorage.getItem(ssoKey())).not.toBeNull();

      // 2. the victim later opens the same login page cleanly
      document.body.innerHTML = '';
      window.location.search = '';
      setNavigationType('navigate');
      mount();
      await waitFor(() => expect(startMock).toHaveBeenCalledTimes(2), {
        timeout: WAIT_TIMEOUT,
      });
      expect(startOptions(1).oidcIdpStateId).toBeNull();
      // the stale entry must be gone, which is what closes the hole
      expect(sessionStorage.getItem(ssoKey())).toBeNull();

      // 3. the victim refreshes that clean page
      document.body.innerHTML = '';
      // a real refresh builds a new document, which resets the per-document
      // reload credit. the SPA remount test below deliberately omits this.
      resetInitializedScopes();
      setNavigationType('reload');
      mount();
      await waitFor(() => expect(startMock).toHaveBeenCalledTimes(3), {
        timeout: WAIT_TIMEOUT,
      });
      expect(startOptions(2).oidcIdpStateId).toBeNull();
    });

    // Shuni, PR #1514 round 2. navigation type belongs to the document and stays
    // 'reload' for its whole life, so a single page app remounting the same flow
    // at the same URL used to look like a refresh and restore the old context.
    it('does not restore when the component remounts in the same document', async () => {
      startMock.mockReturnValue(generateSdkResponse());
      fixtures.pageContent = '<span>It works!</span>';

      window.location.search = `?${OIDC_IDP_STATE_ID_PARAM_NAME}=abcdefgh`;
      mount();
      await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1), {
        timeout: WAIT_TIMEOUT,
      });

      // same document throughout: no resetInitializedScopes() here on purpose.
      // the app routed away and mounted the same flow again at the same url
      document.body.innerHTML = '';
      window.location.search = '';
      setNavigationType('reload');
      mount();

      await waitFor(() => expect(startMock).toHaveBeenCalledTimes(2), {
        timeout: WAIT_TIMEOUT,
      });
      expect(startOptions(1).oidcIdpStateId).toBeNull();
    });

    it('stores nothing for a plain flow with no sso params', async () => {
      startMock.mockReturnValue(generateSdkResponse());
      fixtures.pageContent = '<span>It works!</span>';

      mount();
      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });
      expect(sessionStorage.getItem(ssoKey())).toBeNull();
    });

    it('clears the stored params once the flow completes', async () => {
      startMock.mockReturnValue(generateSdkResponse({ status: 'completed' }));
      fixtures.pageContent = '<span>It works!</span>';

      window.location.search = `?${OIDC_IDP_STATE_ID_PARAM_NAME}=abcdefgh`;
      mount();

      await waitFor(
        () =>
          expect(
            sessionStorage.getItem(
              DESCOPE_SSO_QUERY_PARAMS_SESSION_STORAGE_KEY_PREFIX,
            ),
          ).toBeNull(),
        { timeout: WAIT_TIMEOUT },
      );
    });
  });
});
