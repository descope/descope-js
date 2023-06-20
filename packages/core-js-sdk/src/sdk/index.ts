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
import { JWTResponse, UserResponse } from './types';
import { stringNonEmpty, withValidations } from './validations';
import withWebauthn from './webauthn';

const withJwtValidations = withValidations(stringNonEmpty('token'));

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
  refresh: (token?: string) =>
    transformResponse<JWTResponse>(
      httpClient.post(apiPaths.refresh, {}, { token })
    ),
  logout: (token?: string) =>
    transformResponse<never>(httpClient.post(apiPaths.logout, {}, { token })),
  logoutAll: (token?: string) =>
    transformResponse<never>(
      httpClient.post(apiPaths.logoutAll, {}, { token })
    ),
  me: (token?: string) =>
    transformResponse<UserResponse>(httpClient.get(apiPaths.me, { token })),
  isJwtExpired: withJwtValidations(isJwtExpired),
  getTenants: withJwtValidations(getTenants),
  getJwtPermissions: withJwtValidations(getJwtPermissions),
  getJwtRoles: withJwtValidations(getJwtRoles),
  httpClient,
});
