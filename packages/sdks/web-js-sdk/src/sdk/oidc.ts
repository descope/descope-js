import {
  JWTResponse,
  RequestConfig,
  SdkResponse,
  URLResponse,
} from '@descope/core-js-sdk';
import type {
  CreateSigninRequestArgs,
  CreateSignoutRequestArgs,
  OidcClient,
  OidcClientSettings,
  SigninResponse,
  WebStorageStateStore,
} from 'oidc-client-ts';
import { CoreSdk } from '../types';
import {
  OIDC_CLIENT_TS_DESCOPE_CDN_URL,
  OIDC_CLIENT_TS_JSDELIVR_CDN_URL,
} from '../constants';
import { getIdToken } from '../enhancers/withPersistTokens/helpers';

interface OidcConfig {
  // default is Descope Project ID
  clientId?: string;
  // default is current URL
  redirectUri?: string;
  // default is openid email roles descope.custom_claims offline_access
  scope?: string;
  // default is undefined
  metadataUrl?: string;
  //
  authority?: string;
}

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
  oidcConfig?: OidcConfig,
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

  const clientId = oidcConfig?.clientId || projectId;
  const redirectUri = oidcConfig?.redirectUri || window.location.href;
  const scope =
    oidcConfig?.scope ||
    'openid email roles descope.custom_claims offline_access';
  const stateUserKey = `${clientId}_user`;

  const authority = sdk.httpClient.buildUrl(projectId);
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

  if (oidcConfig?.clientId) {
    settings.client_id = oidcConfig.clientId;
  }
  if (oidcConfig?.redirectUri) {
    settings.redirect_uri = oidcConfig.redirectUri;
  }
  if (oidcConfig?.scope) {
    settings.scope = oidcConfig.scope;
  }
  if (oidcConfig?.metadataUrl) {
    settings.metadataUrl = oidcConfig.metadataUrl;
    console.log('@@@ metadataUrl', settings.metadataUrl);
  }
  if (oidcConfig?.authority) {
    settings.authority = oidcConfig.authority;
    console.log('@@@ authority', settings.authority);
  }
  console.log('@@@ redirect_uri', settings.redirect_uri);
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
  // we build the
  const authorize = async (
    arg: CreateSigninRequestArgs = {},
  ): Promise<SdkResponse<URLResponse>> => {
    console.log('@@@ calling authorize', {
      arg,
    });
    const { client } = await getOidcClient(sdk, projectId, oidcConfig);
    const signInReq = await client.createSigninRequest(arg);
    console.log('@@@ authorize response', signInReq);
    const { url } = signInReq;
    return { ok: true, data: { url } };
  };

  const token = async (): Promise<any> => {
    console.log('@@@ calling token');
    const { client, stateUserKey } = await getOidcClient(
      sdk,
      projectId,
      oidcConfig,
    );
    const signInRes = await client.processSigninResponse(window.location.href);

    // In order to make sure all the after-hooks are running with the success response
    // we are generating a fake response with the success data and calling the http client after hook fn with it
    await sdk.httpClient.hooks.afterRequest(
      {} as any,
      new Response(JSON.stringify(signInRes)),
    );

    console.log('@@@ token response', signInRes);
    window.localStorage.setItem(
      stateUserKey,
      JSON.stringify(oidcSignInResToStorage(signInRes)),
    );
    return signInRes;
  };

  const logout = async (arg?: CreateSignoutRequestArgs) => {
    console.log('@@@ calling logout', {
      arg,
    });
    const { client, stateUserKey } = await getOidcClient(
      sdk,
      projectId,
      oidcConfig,
    );
    if (!arg) {
      arg = {};
    }

    // if id_token_hint is not provided, we will use the one from the storage
    arg.id_token_hint = arg.id_token_hint || getIdToken();
    arg.post_logout_redirect_uri =
      arg.post_logout_redirect_uri || window.location.href;

    const res = await client.createSignoutRequest(arg);
    console.log('@@@ logout response', res.url);
    const { url } = res;
    window.localStorage.removeItem(stateUserKey);
    window.location.replace(url);
  };

  const refreshToken = async (refreshToken: string) => {
    console.trace('@@@ calling refresh token', {
      refreshToken,
    });
    const { client, stateUserKey } = await getOidcClient(sdk, projectId);

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

    console.log('@@@ refresh token response', res);

    // In order to make sure all the after-hooks are running with the success response
    // we are generating a fake response with the success data and calling the http client after hook fn with it
    await sdk.httpClient.hooks.afterRequest(
      {} as any,
      new Response(JSON.stringify(res)),
    );

    return res;
  };

  return {
    logout,
    authorize,
    token,
    refreshToken,
  };
};

export default createOidc;
export type { OidcConfig };
