import createSdk from './createSdk';
import {
  CreateHttpClientConfig,
  ExtendedResponse,
  HttpClient,
  HTTPMethods,
  RequestConfig,
} from './httpClient/types';
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

export { default as HttpStatusCodes } from './constants/httpStatusCodes';
export { default as createHttpClient } from './httpClient';
export { transformResponse } from './sdk/helpers';
export type {
  AccessKeyLoginOptions,
  EnchantedLinkResponse,
  ExchangeAccessKeyResponse,
  FlowAction,
  FlowResponse,
  FlowStatus,
  Claims,
  JWTResponse,
  LoginOptions,
  PasskeyOptions,
  ResponseData,
  SdkResponse,
  TOTPResponse,
  URLResponse,
  UserHistoryResponse,
  UserResponse,
} from './sdk/types';
export * from './utils';
export type { SdkFnWrapper } from './utils';
export type {
  CreateHttpClientConfig,
  ExtendedResponse,
  HttpClient,
  HTTPMethods,
  RequestConfig,
};

/** Type to restrict to valid delivery methods */
export type DeliveryMethod = keyof typeof DeliveryMethods;
/** Type to restrict to valid OAuth providers */
export type OAuthProvider = keyof typeof OAuthProviders;
