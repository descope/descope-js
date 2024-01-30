import { apiPaths } from '../constants';
import { HttpClient } from '../httpClient';
import withAccessKeys from './accesskey';
import withEnchantedLink from './enchantedLink';
import withFlow from './flow';
import {
  getTenants,
  getJwtPermissions,
  getJwtRoles,
  isJwtExpired,
  transformResponse,
} from './helpers';
import withMagicLink from './magicLink';
import withOauth from './oauth';
import withOtp from './otp';
import withSaml from './saml';
import withTotp from './totp';
import withPassword from './password';
import { JWTResponse, UserHistoryResponse, UserResponse } from './types';
import {
  stringNonEmpty,
  withValidations,
  isStringOrUndefinedValidator,
} from './validations';
import withWebauthn from './webauthn';
import { isString, isStringOrUndefined } from './validations/validators';

const withJwtValidations = withValidations(stringNonEmpty('token'));
const withOptionalTokenValidations = withValidations(
  isStringOrUndefinedValidator('token'),
);

/** Returns Descope SDK with all available operations */
export default (httpClient: HttpClient) => ({
  accessKey: withAccessKeys(httpClient),
  otp: withOtp(httpClient),
  magicLink: withMagicLink(httpClient),
  enchantedLink: withEnchantedLink(httpClient),
  oauth: withOauth(httpClient),
  saml: withSaml(httpClient),
  totp: withTotp(httpClient),
  webauthn: withWebauthn(httpClient),
  password: withPassword(httpClient),
  flow: withFlow(httpClient),
  /**
   * Refreshes a session token
   * Should be called when a session has expired (failed validation) to renew it
   * @param token A valid refresh token
   * @returns The updated authentication info (JWTs)
   */
  refresh: withOptionalTokenValidations((token?: string) =>
    transformResponse<JWTResponse>(
      httpClient.post(apiPaths.refresh, {}, { token }),
    ),
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
  httpClient,
});
