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
      // eslint-disable-next-line consistent-return
      [provider]: async (
        redirectUrl?: string,
        { redirect = false } = {},
        loginOptions?: LoginOptions,
        token?: string
      ) => {
        const resp = await httpClient.post(
          apiPaths.oauth.start,
          loginOptions || {},
          {
            queryParams: {
              provider,
              ...(redirectUrl && { redirectURL: redirectUrl }),
            },
            token,
          }
        );
        if (!redirect || !resp.ok)
          return transformResponse<SdkResponse<URLResponse>>(
            Promise.resolve(resp)
          );

        const { url } = await resp.json();
        window.location.href = url;
      },
    }),
    {}
  ) as Oauth['start'],
  exchange: withExchangeValidations(
    (code: string): Promise<SdkResponse<JWTResponse>> =>
      transformResponse(httpClient.post(apiPaths.oauth.exchange, { code }))
  ),
});

export default withOauth;
