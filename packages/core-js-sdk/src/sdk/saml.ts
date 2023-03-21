import { apiPaths } from '../constants';
import { HttpClient } from '../httpClient';
import { transformResponse } from './helpers';
import { SdkResponse, URLResponse, JWTResponse, LoginOptions } from './types';
import { stringNonEmpty, withValidations } from './validations';

const withStartValidations = withValidations(stringNonEmpty('tenant'));
const withExchangeValidations = withValidations(stringNonEmpty('code'));

type StartFn = <B extends { redirect: boolean }>(
  tenantNameOrEmail: string,
  config?: B
) => Promise<
  B extends { redirect: true } ? undefined : SdkResponse<URLResponse>
>;

const withSaml = (httpClient: HttpClient) => ({
  // eslint-disable-next-line consistent-return
  start: withStartValidations(
    async (
      tenantNameOrEmail: string,
      redirectUrl?: string,
      { redirect = false } = {},
      loginOptions?: LoginOptions,
      token?: string
    ) => {
      const resp = await httpClient.post(
        apiPaths.saml.start,
        loginOptions || {},
        {
          queryParams: { tenant: tenantNameOrEmail, redirectURL: redirectUrl },
          token,
        }
      );

      if (!redirect || !resp.ok)
        return transformResponse(Promise.resolve(resp));

      const { url } = await resp.json();
      window.location.href = url;
    }
  ) as StartFn,
  exchange: withExchangeValidations(
    (code: string): Promise<SdkResponse<JWTResponse>> =>
      transformResponse(httpClient.post(apiPaths.saml.exchange, { code }))
  ),
});

export default withSaml;
