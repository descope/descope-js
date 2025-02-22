import { JWTResponse, SdkResponse, URLResponse } from '@descope/core-js-sdk';
import type {
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

  // Asaf - maybe to set state by projectId, or maybe we need per application
  const statePrefix = window.location.origin.replace(/\//g, '_');
  const stateUserKey = `${statePrefix}_user`;

  const settings: OidcClientSettings = {
    authority: sdk.httpClient.buildUrl(projectId),
    client_id: projectId,
    redirect_uri: window.location.href,
    post_logout_redirect_uri: window.location.origin + window.location.pathname,
    response_type: 'code',
    scope: 'openid email roles descope.custom_claims offline_access',
    stateStore: new WebStorageStateStore({
      store: window.localStorage,
      prefix: statePrefix,
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
    settings.scope = oidcConfig.scope
  }
  return {
    client: new OidcClient(settings),
    stateUserKey,
  };
};

const createOidc = (sdk: CoreSdk, projectId: string) => {
  const authorize = async (
    oidcConfig?: OidcConfig,
  ): Promise<SdkResponse<URLResponse>> => {
    const { client } = await getOidcClient(sdk, projectId, oidcConfig);
    const { url } = await client.createSigninRequest({});
    return { ok: true, data: { url } };
  };

  const token = async (oidcConfig?: OidcConfig): Promise<any> => {
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
    // Asaf - I'm not sure we want to set this in the local storage
    window.localStorage.setItem(stateUserKey, JSON.stringify(signInRes));
    // return client.useRefreshToken({
    //   state: {
    //     refresh_token: signInRes.refresh_token,
    //     ...signInRes,
    //   },
    // });
    return signInRes;
  };

  const getUser = (stateUserKey: string): SigninResponse | null => {
    const user = window.localStorage.getItem(stateUserKey);
    return user ? JSON.parse(user) : null;
  };

  const logout = async (oidcConfig?: OidcConfig) => {
    const { client, stateUserKey } = await getOidcClient(
      sdk,
      projectId,
      oidcConfig,
    );
    const user = getUser(stateUserKey);
    if (user) {
      const { url } = await client.createSignoutRequest({
        state: user,
        id_token_hint: user.id_token,
      });
      window.localStorage.removeItem(stateUserKey);
      window.location.replace(url);
    }
  };

  const refreshToken = async (refreshToken: string) => {
    console.log('@@@ calling refreshToken');
    const { client, stateUserKey } = await getOidcClient(
      sdk,
      projectId,
    );

    const user = getUser(stateUserKey);
    console.log('user', user);
    const res = await client.useRefreshToken({
      state: {
        refresh_token: refreshToken,
        ...user,
      },
    });

    // In order to make sure all the after-hooks are running with the success response
    // we are generating a fake response with the success data and calling the http client after hook fn with it
    await sdk.httpClient.hooks.afterRequest(
      {} as any,
      new Response(JSON.stringify(oidcSignInResToWebJWTRes(res))),
    );

    return res;
  }

  return {
    logout,
    authorize,
    token,
    refreshToken
  };
};

export default createOidc;
export type { OidcConfig };
