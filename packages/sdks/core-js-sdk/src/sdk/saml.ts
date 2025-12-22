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
      tenantIdOrEmail: string,
      redirectUrl?: string,
      loginOptions?: LoginOptions,
      token?: string,
      ssoId?: string,
      forceAuthn?: boolean,
      loginHint?: string,
      enforceInitiatedEmail?: boolean,
    ): Promise<SdkResponse<URLResponse>> =>
      transformResponse(
        httpClient.post(apiPaths.saml.start, loginOptions || {}, {
          queryParams: {
            tenant: tenantIdOrEmail,
            ...(redirectUrl && { redirectURL: redirectUrl }),
            ...(ssoId && { ssoId }),
            ...(forceAuthn && { forceAuthn: 'true' }),
            ...(loginHint && { loginHint }),
            ...(enforceInitiatedEmail && { initiatedEmail: tenantIdOrEmail }),
          },
          ...(token && { token }),
        }),
      ),
  ),
  exchange: withExchangeValidations(
    (code: string): Promise<SdkResponse<JWTResponse>> =>
      transformResponse(httpClient.post(apiPaths.saml.exchange, { code })),
  ),
});

export default withSaml;
