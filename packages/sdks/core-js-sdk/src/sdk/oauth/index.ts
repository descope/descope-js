import { apiPaths } from '../../constants';
import { HttpClient } from '../../httpClient';
import {
  SdkResponse,
  JWTResponse,
  LoginOptions,
  ClientIdResponse,
} from '../types';
import { transformResponse } from '../helpers';
import { Oauth, OAuthProviders } from './types';
import { stringNonEmpty, withValidations } from '../validations';

const withExchangeValidations = withValidations(stringNonEmpty('code'));
const withOauth = (httpClient: HttpClient) => ({
  start: Object.assign(
    (
      provider: string,
      redirectUrl?: string,
      loginOptions?: LoginOptions,
      token?: string,
    ) => {
      return transformResponse(
        httpClient.post(apiPaths.oauth.start, loginOptions || {}, {
          queryParams: {
            provider,
            ...(redirectUrl && { redirectURL: redirectUrl }),
          },
          token,
        }),
      );
    },
    Object.keys(OAuthProviders).reduce(
      (acc, provider) => ({
        ...acc,
        [provider]: (
          redirectUrl?: string,
          loginOptions?: LoginOptions,
          token?: string,
        ) =>
          transformResponse(
            httpClient.post(apiPaths.oauth.start, loginOptions || {}, {
              queryParams: {
                provider,
                ...(redirectUrl && { redirectURL: redirectUrl }),
              },
              token,
            }),
          ),
      }),
      {},
    ) as Oauth['start'],
  ),
  exchange: withExchangeValidations(
    (code: string): Promise<SdkResponse<JWTResponse>> =>
      transformResponse(httpClient.post(apiPaths.oauth.exchange, { code })),
  ),
  startNative: (
    provider: string,
    loginOptions?: LoginOptions,
    implicit?: boolean,
  ) =>
    transformResponse(
      httpClient.post(apiPaths.oauth.startNative, {
        provider,
        loginOptions,
        implicit,
      }),
    ),
  finishNative: (
    provider: string,
    stateId: string,
    user?: string,
    code?: string,
    idToken?: string,
  ) =>
    transformResponse(
      httpClient.post(apiPaths.oauth.finishNative, {
        provider,
        stateId,
        user,
        code,
        idToken,
      }),
    ),
  getOneTapClientId: (provider: string) =>
    transformResponse<ClientIdResponse>(
      httpClient.get(
        apiPaths.oauth.oneTap.getOneTapClientId.replace('{provider}', provider),
      ),
    ),
  exchangeProviderToken: (
    provider: string,
    idToken: string,
    nonce: string,
    loginOptions?: LoginOptions,
  ) =>
    transformResponse(
      httpClient.post(apiPaths.oauth.oneTap.exchangeOneTapIDToken, {
        provider,
        idToken,
        nonce,
        loginOptions,
      }),
    ),
});

export default withOauth;
