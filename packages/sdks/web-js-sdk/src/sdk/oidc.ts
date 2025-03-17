import { JWTResponse, SdkResponse, URLResponse } from '@descope/core-js-sdk';
import type {
  CreateSigninRequestArgs,
  CreateSignoutRequestArgs,
  OidcClient,
  OidcClientSettings,
  SigninResponse,
  WebStorageStateStore,
} from 'oidc-client-ts';
import { CoreSdk, WebJWTResponse } from '../types';
import {
  OIDC_CLIENT_TS_DESCOPE_CDN_URL,
  OIDC_CLIENT_TS_JSDELIVR_CDN_URL,
} from '../constants';

interface OidcConfig {
  clientId?: string;
  redirectUri?: string;
  scope?: string;
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

const oidcSignInResToWebJWTRes = (
  signInRes: SigninResponse,
): WebJWTResponse => {
  const accessToken = signInRes.access_token;
  const refreshToken = signInRes.refresh_token;
  const idToken = signInRes.id_token;
  return {
    sessionJwt: accessToken,
    refreshJwt: refreshToken,
    idTokenJwt: idToken,
    cookieExpiration: signInRes.expires_at,
    oidc: true,
  };
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
  console.log('@@@ CreateClient', { authority });
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
  const authorize = async (arg: CreateSigninRequestArgs): Promise<SdkResponse<URLResponse>> => {
    const { client } = await getOidcClient(sdk, projectId, oidcConfig);
    const { url } = await client.createSigninRequest(arg);
    return { ok: true, data: { url } };
  };

  const token = async (): Promise<any> => {
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
      new Response(JSON.stringify(oidcSignInResToWebJWTRes(signInRes))),
    );
    window.localStorage.setItem(
      stateUserKey,
      JSON.stringify(oidcSignInResToStorage(signInRes)),
    );
    return signInRes;
  };

  const logout = async (arg?: CreateSignoutRequestArgs) => {
    const { client, stateUserKey } = await getOidcClient(
      sdk,
      projectId,
      oidcConfig,
    );
    const user = getUserFromStorage(stateUserKey);

    if (user) {
      const { url } = await client.createSignoutRequest(arg);
      window.localStorage.removeItem(stateUserKey);
      window.location.replace(url);
    }
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
    const res = await client.useRefreshToken({
      state: {
        refresh_token: refreshToken,
        session_state: user.session_state,
        profile: user.profile,
      },
    });

    // In order to make sure all the after-hooks are running with the success response
    // we are generating a fake response with the success data and calling the http client after hook fn with it
    await sdk.httpClient.hooks.afterRequest(
      {} as any,
      new Response(JSON.stringify(oidcSignInResToWebJWTRes(res))),
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
