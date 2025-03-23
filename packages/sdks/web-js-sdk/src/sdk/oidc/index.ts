import { RequestConfig, SdkResponse, URLResponse } from '@descope/core-js-sdk';
import type {
  CreateSigninRequestArgs,
  CreateSignoutRequestArgs,
  OidcClient,
  OidcClientSettings,
  SigninResponse,
  WebStorageStateStore,
} from 'oidc-client-ts';
import {
  OIDC_CLIENT_TS_DESCOPE_CDN_URL,
  OIDC_CLIENT_TS_JSDELIVR_CDN_URL,
} from '../../constants';
import { getIdToken } from '../../enhancers/withPersistTokens/helpers';
import { CoreSdk, OidcConfig, OidcConfigOptions } from '../../types';
import { hasOidcParamsInUrl, removeOidcParamFromUrl } from './helpers';

type OidcModule = {
  OidcClient: typeof OidcClient;
  WebStorageStateStore: typeof WebStorageStateStore;
};

type SignInResponseStorage = Pick<
  SigninResponse,
  'id_token' | 'session_state' | 'profile'
>;

let scriptLoadingPromise: Promise<OidcModule>;

const simpleHash = (input: string): string => {
  let hash = 0;

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(16); // Return hash as a positive hexadecimal string
};

const loadScriptWithFallback = (
  urls: string[],
  getEntry: () => OidcModule,
): Promise<OidcModule> => {
  return new Promise((resolve, reject) => {
    if (!urls.length)
      return reject(new Error('No URLs provided to loadScriptWithFallback'));

    const entry = getEntry();
    if (entry) return resolve(entry);

    const url = urls.shift();

    const scriptEle = document.createElement('script');
    scriptEle.src = url;
    scriptEle.id = simpleHash(url);
    scriptEle.onload = () => {
      const entry = getEntry();
      if (entry) return resolve(entry);
      throw new Error('Could not get entry after loading script from URL');
    };
    scriptEle.addEventListener('error', () => {
      loadScriptWithFallback(urls, getEntry);
      scriptEle.setAttribute('data-error', 'true');
    });
    document.body.appendChild(scriptEle);
  });
};

const loadOIDCModule = async (): Promise<OidcModule> => {
  try {
    return import('oidc-client-ts');
  } catch (e) {
    return loadScriptWithFallback(
      [OIDC_CLIENT_TS_DESCOPE_CDN_URL, OIDC_CLIENT_TS_JSDELIVR_CDN_URL],
      () => window['oidc'],
    );
  }
};

function oidcSignInResToStorage(
  signInRes: SigninResponse,
): SignInResponseStorage {
  return {
    id_token: signInRes.id_token,
    session_state: signInRes.session_state,
    profile: signInRes.profile,
  };
}

const getUserFromStorage = (
  stateUserKey: string,
): SignInResponseStorage | null => {
  const user = window.localStorage.getItem(stateUserKey);
  return user ? JSON.parse(user) : null;
};

const getOidcClient = async (
  sdk: CoreSdk,
  projectId: string,
  oidcConfig?: OidcConfigOptions,
) => {
  if (!scriptLoadingPromise) {
    scriptLoadingPromise = loadOIDCModule();
  }
  const { OidcClient, WebStorageStateStore } = await scriptLoadingPromise;

  if (!OidcClient) {
    throw new Error(
      'oidc-client-ts is not installed. Please install it by running `npm install oidc-client-ts`',
    );
  }

  const clientId = projectId;
  const redirectUri = oidcConfig?.redirectUri || window.location.href;
  const scope =
    oidcConfig?.scope ||
    'openid email roles descope.custom_claims offline_access';
  const stateUserKey = `${clientId}_user`;

  let authority = sdk.httpClient.buildUrl(projectId);
  if (oidcConfig?.applicationId) {
    // append the applicationId to the authority
    authority = `${authority}/${oidcConfig.applicationId}`;
  }

  const settings: OidcClientSettings = {
    authority,
    client_id: projectId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    stateStore: new WebStorageStateStore({
      store: window.localStorage,
      prefix: clientId,
    }),
    loadUserInfo: true,
    fetchRequestCredentials: 'same-origin',
  };

  if (oidcConfig?.redirectUri) {
    settings.redirect_uri = oidcConfig.redirectUri;
  }
  if (oidcConfig?.scope) {
    settings.scope = oidcConfig.scope;
  }
  return {
    client: new OidcClient(settings),
    stateUserKey,
  };
};

const createOidc = (
  sdk: CoreSdk,
  projectId: string,
  oidcConfig?: OidcConfig,
) => {
  const getCachedClient = async (): Promise<{
    client: OidcClient;
    stateUserKey: string;
  }> => {
    let client, stateUserKey;
    if (!client || !stateUserKey) {
      ({ client, stateUserKey } = await getOidcClient(
        sdk,
        projectId,
        oidcConfig as OidcConfigOptions,
      ));
    }
    return { client, stateUserKey };
  };

  // Start the login process by creating a signin request
  // And redirecting the user to the returned URL
  const login = async (
    arg: CreateSigninRequestArgs = {},
    disableNavigation: boolean = false,
  ): Promise<SdkResponse<URLResponse>> => {
    const { client } = await getCachedClient();
    const res = await client.createSigninRequest(arg);
    const { url } = res;
    if (!disableNavigation) {
      window.location.href = url;
    }
    return { ok: true, data: res };
  };

  // Finish the login process by processing the signin response
  // This function should be called after the user is redirected from the OIDC IdP
  const finishLogin = async (url: string = ''): Promise<any> => {
    const { client, stateUserKey } = await getCachedClient();
    const res = await client.processSigninResponse(url || window.location.href);

    // In order to make sure all the after-hooks are running with the success response
    // we are generating a fake response with the success data and calling the http client after hook fn with it
    await sdk.httpClient.hooks?.afterRequest(
      {} as any,
      new Response(JSON.stringify(res)),
    );

    window.localStorage.setItem(
      stateUserKey,
      JSON.stringify(oidcSignInResToStorage(res)),
    );
    // remove the code from the URL
    removeOidcParamFromUrl();

    return res;
  };

  // Finish the login process if the OIDC params are in the URL, if not, do nothing
  // This function should be called after the user is redirected
  // Note: high level SDKs should call this function to check if the user is in the middle of the login process
  // Asaf - alternative name: conditionallyFinishLogin
  const finishLoginIfNeed = async (url: string = ''): Promise<any> => {
    if (hasOidcParamsInUrl()) {
      return await finishLogin(url);
    }
  };

  // Start the logout process by creating a signout request
  // And redirecting the user to the returned URL
  const logout = async (
    arg?: CreateSignoutRequestArgs,
    disableNavigation: boolean = false,
  ): Promise<any> => {
    const { client, stateUserKey } = await getCachedClient();
    if (!arg) {
      arg = {};
    }

    // if id_token_hint is not provided, we will use the one from the storage
    arg.id_token_hint = arg.id_token_hint || getIdToken();
    arg.post_logout_redirect_uri =
      arg.post_logout_redirect_uri || window.location.href;

    const res = await client.createSignoutRequest(arg);
    const { url } = res;
    window.localStorage.removeItem(stateUserKey);
    if (!disableNavigation) {
      window.location.replace(url);
    }
    return res;
  };

  // Refresh the access token using the refresh token
  const refreshToken = async (refreshToken: string) => {
    const { client, stateUserKey } = await getCachedClient();

    const user = getUserFromStorage(stateUserKey);
    if (!user) {
      throw new Error('User not found in storage to refresh token');
    }

    let refresh_token = refreshToken;
    if (!refresh_token) {
      // if refresh token is not provided, we will use the one from the hooks
      const config = {} as RequestConfig;
      sdk.httpClient.hooks.beforeRequest(config);
      refresh_token = config.token;
    }
    const res = await client.useRefreshToken({
      state: {
        refresh_token,
        session_state: user.session_state,
        profile: user.profile,
      },
    });

    // In order to make sure all the after-hooks are running with the success response
    // we are generating a fake response with the success data and calling the http client after hook fn with it
    await sdk.httpClient.hooks?.afterRequest(
      {} as any,
      new Response(JSON.stringify(res)),
    );

    return res;
  };

  return {
    login,
    finishLogin,
    finishLoginIfNeed,
    refreshToken,
    logout,
  };
};

export default createOidc;
export type { OidcConfig };
