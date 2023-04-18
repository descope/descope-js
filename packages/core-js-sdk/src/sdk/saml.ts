import { apiPaths } from '../constants';
import { HttpClient } from '../httpClient';
import { transformResponse } from './helpers';
import { SdkResponse, URLResponse, JWTResponse, LoginOptions } from './types';
import { stringNonEmpty, withValidations } from './validations';

const withStartValidations = withValidations(stringNonEmpty('tenant'));
const withExchangeValidations = withValidations(stringNonEmpty('code'));

const withSaml = (httpClient: HttpClient) => ({
  start: withStartValidations(
    (
      tenantNameOrEmail: string,
      redirectUrl?: string,
      loginOptions?: LoginOptions,
      token?: string
    ): Promise<SdkResponse<JWTResponse>> =>
      transformResponse(
        httpClient.post(apiPaths.saml.start, loginOptions || {}, {
          queryParams: { tenant: tenantNameOrEmail, redirectURL: redirectUrl },
          token,
        })
      )
  ),
  exchange: withExchangeValidations(
    (code: string): Promise<SdkResponse<JWTResponse>> =>
      transformResponse(httpClient.post(apiPaths.saml.exchange, { code }))
  ),
});

export default withSaml;
