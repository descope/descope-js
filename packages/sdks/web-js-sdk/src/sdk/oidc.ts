import { JWTResponse, SdkResponse, URLResponse } from '@descope/core-js-sdk';
import type {
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

interface OidcConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
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

const getOidcClient = async (
  sdk: CoreSdk,
  projectID: string,
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

  const statePrefix = window.location.pathname.replace(/\//g, '_');
  const stateUserKey = `${statePrefix}_user`;

  const settings: OidcClientSettings = {
    authority: sdk.httpClient.buildUrl(projectID),
    client_id: projectID,
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

  if (oidcConfig) {
    settings.client_id = oidcConfig.clientId;
    settings.redirect_uri = oidcConfig.redirectUri;
    settings.scope = oidcConfig.scope;
  }
  return {
    client: new OidcClient(settings),
    stateUserKey,
  };
};

const createOidc = (sdk: CoreSdk, projectID: string) => {
  const authorize = async (
    oidcConfig?: OidcConfig,
  ): Promise<SdkResponse<URLResponse>> => {
    const { client } = await getOidcClient(sdk, projectID, oidcConfig);
    const { url } = await client.createSigninRequest({});
    return { ok: true, data: { url } };
  };

  const token = async (
    oidcConfig?: OidcConfig,
  ): Promise<SdkResponse<JWTResponse>> => {
    const { client, stateUserKey } = await getOidcClient(
      sdk,
      projectID,
      oidcConfig,
    );
    const user = await client.processSigninResponse(window.location.href);
    window.localStorage.setItem(stateUserKey, JSON.stringify(user));
    return sdk.refresh(user.refresh_token);
  };

  const getUser = (stateUserKey: string): SigninResponse | null => {
    const user = window.localStorage.getItem(stateUserKey);
    return user ? JSON.parse(user) : null;
  };

  const logout = async (oidcConfig?: OidcConfig) => {
    const { client, stateUserKey } = await getOidcClient(
      sdk,
      projectID,
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

  return {
    authorize,
    token,
    logout,
  };
};

export default createOidc;
export type { OidcConfig };
