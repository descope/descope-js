import { apiPaths } from '../constants';
import { HttpClient } from '../httpClient';
import withAccessKeys from './accesskey';
import withDescoper from './descoper';
import withEnchantedLink from './enchantedLink';
import withFlow from './flow';
import {
  getTenants,
  getJwtPermissions,
  getJwtRoles,
  getCurrentTenant,
  isJwtExpired,
  transformResponse,
} from './helpers';
import withMagicLink from './magicLink';
import withOauth from './oauth';
import withOutbound from './outbound';
import withOtp from './otp';
import withSaml from './saml';
import withTotp from './totp';
import withPassword from './password';
import {
  JWTResponse,
  TenantsResponse,
  UserHistoryResponse,
  UserResponse,
} from './types';
import {
  stringNonEmpty,
  withValidations,
  isStringOrUndefinedValidator,
} from './validations';
import withWebauthn from './webauthn';
import {
  isArrayOrBool,
  isString,
  isStringOrUndefined,
} from './validations/validators';
import withNotp from './notp';

const withJwtValidations = withValidations(stringNonEmpty('token'));
const withOptionalTokenValidations = withValidations(
  isStringOrUndefinedValidator('token'),
);

/** Returns Descope SDK with all available operations */
export default (httpClient: HttpClient) => ({
  accessKey: withAccessKeys(httpClient),
  descoper: withDescoper(httpClient),
  otp: withOtp(httpClient),
  magicLink: withMagicLink(httpClient),
  enchantedLink: withEnchantedLink(httpClient),
  oauth: withOauth(httpClient),
  outbound: withOutbound(httpClient),
  saml: withSaml(httpClient),
  totp: withTotp(httpClient),
  notp: withNotp(httpClient),
  webauthn: withWebauthn(httpClient),
  password: withPassword(httpClient),
  flow: withFlow(httpClient),
  /**
   * Refreshes a session token
   * Should be called when a session has expired (failed validation) to renew it
   * @param token A valid refresh token
   * @param queryParams Additional query parameters to send with the request.
   * @param externalToken An external token to exchange for a new session token
   * @param tryRefresh If true, will use the tryRefresh endpoint, which will not fail if token is missing, invalid or expired.
   *    NOTE - queryParams is used internally and should NOT be used by other consumers, this is subject to change and may be removed in the near future.
   * @returns The updated authentication info (JWTs)
   */
  refresh: withOptionalTokenValidations(
    (
      token?: string,
      queryParams?: { [key: string]: string },
      externalToken?: string,
      tryRefresh?: boolean,
    ) => {
      const body = {};
      if (externalToken) {
        body['externalToken'] = externalToken;
      }
      const path = tryRefresh ? apiPaths.tryRefresh : apiPaths.refresh;
      return transformResponse<JWTResponse>(
        httpClient.post(path, body, { token, queryParams }),
      );
    },
  ),
  /**
   * Selects a tenant for the current session
   * @param tenantId The tenant to select
   * @param token A valid refresh token
   * @returns The updated authentication info (JWTs). The session token will be updated with the selected tenant under the "dct" claim
   */
  selectTenant: withValidations(
    [isString('tenantId')],
    [isStringOrUndefined('"token" must be string or undefined')],
  )((tenantId: string, token?: string) =>
    transformResponse<JWTResponse>(
      httpClient.post(apiPaths.selectTenant, { tenant: tenantId }, { token }),
    ),
  ),
  /**
   * Logs out the current session
   * @param token A valid refresh token
   */
  logout: withOptionalTokenValidations((token?: string) =>
    transformResponse<never>(httpClient.post(apiPaths.logout, {}, { token })),
  ),
  /**
   * Logs out all sessions for the current user
   * @param token A valid refresh token
   */
  logoutAll: withOptionalTokenValidations((token?: string) =>
    transformResponse<never>(
      httpClient.post(apiPaths.logoutAll, {}, { token }),
    ),
  ),
  /**
   * Returns the current user details
   * @param token A valid refresh token
   * @returns The current user details
   */
  me: withOptionalTokenValidations((token?: string) =>
    transformResponse<UserResponse>(httpClient.get(apiPaths.me, { token })),
  ),
  /**
   * Returns the current user details
   * @param tenants set to true IFF the response should include only the selected tenant from JWT, or list of tenant ids
   * @param token A valid refresh token
   * @returns The current user details
   */
  myTenants: withValidations(
    [isArrayOrBool('"tenants" must a string array or a boolean')],
    [isStringOrUndefined('"token" must be string or undefined')],
  )((tenants: true | string[], token?: string) => {
    const body = {};
    if (typeof tenants === 'boolean') {
      body['dct'] = tenants;
    } else {
      body['ids'] = tenants;
    }
    return transformResponse<TenantsResponse>(
      httpClient.post(apiPaths.myTenants, body, { token }),
    );
  }),
  /**
   * Returns the current user authentication history
   * @param token A valid refresh token
   * @returns The current user authentication history
   */
  history: withOptionalTokenValidations((token?: string) =>
    transformResponse<UserHistoryResponse>(
      httpClient.get(apiPaths.history, { token }),
    ),
  ),
  /**
   * Checks if the given JWT is still valid but DOES NOT check for signature
   * @param token A valid token
   * @returns true if the JWT is expired, false otherwise
   */
  isJwtExpired: withJwtValidations(isJwtExpired),
  /**
   * Returns the list of tenants in the given JWT but DOES NOT check for signature
   * @param token A valid token
   * @returns The list of tenants in the given JWT
   */
  getTenants: withJwtValidations(getTenants),
  /**
   * Returns the list of permissions granted in the given JWT but DOES NOT check for signature
   * @param token A valid token
   * @param tenant The tenant to check permissions for. If not provided, the permissions for the current tenant will be returned
   * @returns The list of permissions granted in the given JWT
   */
  getJwtPermissions: withJwtValidations(getJwtPermissions),
  /**
   * Returns the list of roles specified in the given JWT but DOES NOT check for signature
   * @param token A valid token
   * @param tenant The tenant to check roles for. If not provided, the roles for the current tenant will be returned
   * @returns The list of roles specified in the given JWT
   */
  getJwtRoles: withJwtValidations(getJwtRoles),
  /**
   * Returns Descope current tenant from the given JWT but DOES NOT check for signature
   * @param token A valid token
   * @returns The current tenant from the given JWT
   */
  getCurrentTenant: withJwtValidations(getCurrentTenant),
  /**
   * Parses the given JWT token but DOES NOT check for signature
   * @param token A valid token
   * @returns The parsed JWT token
   */
  httpClient,
});
