import { apiPaths } from '../../constants';
import { HttpClient } from '../../httpClient';
import { SdkResponse, URLResponse, JWTResponse, LoginOptions } from '../types';
import { transformResponse } from '../helpers';
import { Oauth, OAuthProviders } from './types';
import { stringNonEmpty, withValidations } from '../validations';

const withExchangeValidations = withValidations(stringNonEmpty('code'));

const withOauth = (httpClient: HttpClient) => ({
  start: Object.keys(OAuthProviders).reduce(
    (acc, provider) => ({
      ...acc,
      [provider]: (
        redirectUrl?: string,
        loginOptions?: LoginOptions,
        token?: string
      ) =>
        transformResponse(
          httpClient.post(apiPaths.oauth.start, loginOptions || {}, {
            queryParams: {
              provider,
              ...(redirectUrl && { redirectURL: redirectUrl }),
            },
            token,
          })
        ),
    }),
    {}
  ) as Oauth['start'],
  exchange: withExchangeValidations(
    (code: string): Promise<SdkResponse<JWTResponse>> =>
      transformResponse(httpClient.post(apiPaths.oauth.exchange, { code }))
  ),
});

export default withOauth;
