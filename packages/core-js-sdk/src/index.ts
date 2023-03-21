import createSdk from './createSdk';
import { HTTPMethods, RequestConfig } from './httpClient/types';
import { OAuthProviders } from './sdk/oauth/types';
import { DeliveryMethods } from './sdk/types';

/** Descope SDK client with delivery methods enum.
 *
 * Please see full documentation at {@link https://docs.descope.com/guides Descope Docs}
 * @example Usage
 *
 * ```js
 * import descopeSdk from '@descope/core-js-sdk';
 *
 * const myProjectId = 'xxx';
 * const sdk = descopeSdk({ projectId: myProjectId });
 *
 * const userLoginId = 'loginId';
 * sdk.otp.signIn.email(userLoginId);
 * const jwtResponse = sdk.otp.verify.email(userIdentifier, codeFromEmail);
 * ```
 */
export default Object.assign(createSdk, { DeliveryMethods });

export { transformResponse } from './sdk/helpers';
export type {
  EnchantedLinkResponse,
  ExchangeAccessKeyResponse,
  FlowAction,
  FlowResponse,
  FlowStatus,
  JWTResponse,
  ResponseData,
  SdkResponse,
  TOTPResponse,
  URLResponse,
  UserResponse,
} from './sdk/types';
export * from './utils';
export { default as HttpStatusCodes } from './constants/httpStatusCodes';
export type { SdkFnWrapper } from './utils';
export type { HTTPMethods, RequestConfig };

/** Type to restrict to valid delivery methods */
export type DeliveryMethod = keyof typeof DeliveryMethods;
/** Type to restrict to valid OAuth providers */
export type OAuthProvider = keyof typeof OAuthProviders;
