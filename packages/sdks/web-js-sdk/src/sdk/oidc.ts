import { JWTResponse, SdkResponse, URLResponse } from '@descope/core-js-sdk';
import {
  OidcClient,
  OidcClientSettings,
  SigninResponse,
  WebStorageStateStore,
} from 'oidc-client-ts';
import { AfterRequestHook, CoreSdk } from '../types';

interface OidcConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
}

const getOidcClient = (
  sdk: CoreSdk,
  projectID: string,
  oidcConfig?: OidcConfig,
) => {
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
    const { client } = getOidcClient(sdk, projectID, oidcConfig);
    const { url } = await client.createSigninRequest({});
    return { ok: true, data: { url } };
  };

  const finish = async (
    oidcConfig?: OidcConfig,
  ): Promise<SdkResponse<JWTResponse>> => {
    const { client, stateUserKey } = getOidcClient(sdk, projectID, oidcConfig);
    const user = await client.processSigninResponse(window.location.href);
    window.localStorage.setItem(stateUserKey, JSON.stringify(user));
    return sdk.refresh(user.refresh_token);
  };

  const getUser = (stateUserKey: string): SigninResponse | null => {
    const user = window.localStorage.getItem(stateUserKey);
    return user ? JSON.parse(user) : null;
  };

  const logout = async (oidcConfig?: OidcConfig) => {
    const { client, stateUserKey } = getOidcClient(sdk, projectID, oidcConfig);
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
    finish,
    logout,
  };
};

export default createOidc;
export type { OidcConfig };
