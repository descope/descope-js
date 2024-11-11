import {
  OidcClient,
  OidcClientSettings,
  SigninResponse,
  WebStorageStateStore,
} from 'oidc-client-ts';
import { CoreSdk } from '../types';
import { SdkResponse, JWTResponse, URLResponse } from '@descope/core-js-sdk';

const getOidcClient = (
  sdk: CoreSdk,
  projectID: string,
  oidcSettings?: OidcClientSettings,
) => {
  const statePrefix = window.location.pathname.replace(/\//g, '_');
  const stateUserKey = `${statePrefix}_user`;

  const defaultSettings: OidcClientSettings = {
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

  return {
    client: new OidcClient({ ...defaultSettings, ...oidcSettings }),
    stateUserKey,
  };
};

const createOidc = (sdk: CoreSdk, projectID: string) => {
  const authorize = async (
    oidcSettings?: OidcClientSettings,
  ): Promise<SdkResponse<URLResponse>> => {
    const { client } = getOidcClient(sdk, projectID, oidcSettings);
    const { url } = await client.createSigninRequest({});
    return { ok: true, data: { url } };
  };

  const finish = async (
    oidcSettings?: OidcClientSettings,
  ): Promise<SdkResponse<JWTResponse & { oidcResponse: SigninResponse }>> => {
    const { client, stateUserKey } = getOidcClient(
      sdk,
      projectID,
      oidcSettings,
    );
    const user = await client.processSigninResponse(window.location.href);
    window.localStorage.setItem(stateUserKey, JSON.stringify(user));
    const res = await sdk.refresh(user.refresh_token);
    return { ...res, data: { ...res.data, oidcResponse: user } };
  };

  const getUser = (stateUserKey: string): SigninResponse | null => {
    const user = window.localStorage.getItem(stateUserKey);
    return user ? JSON.parse(user) : null;
  };

  const logout = async (oidcSettings?: OidcClientSettings) => {
    const { client, stateUserKey } = getOidcClient(
      sdk,
      projectID,
      oidcSettings,
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
    finish,
    logout,
  };
};

export default createOidc;
