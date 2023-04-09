import {
  apiPaths,
  ENCHANTED_LINK_MAX_POLLING_TIMEOUT_MS,
  ENCHANTED_LINK_MIN_POLLING_INTERVAL_MS,
} from '../../constants';
import { HttpClient } from '../../httpClient';
import { pathJoin, transformResponse } from '../helpers';
import {
  DeliveryMethods,
  SdkResponse,
  JWTResponse,
  EnchantedLinkResponse,
  User,
  LoginOptions,
} from '../types';
import { EnchantedLink, Routes, WaitForSessionConfig } from './types';
import {
  withWaitForSessionValidations,
  withSignValidations,
  withVerifyValidations,
  withUpdateEmailValidations,
} from './validations';

/** Polling configuration with defaults and normalizing checks */
const normalizeWaitForSessionConfig = ({
  pollingIntervalMs = ENCHANTED_LINK_MIN_POLLING_INTERVAL_MS,
  timeoutMs = ENCHANTED_LINK_MAX_POLLING_TIMEOUT_MS,
} = {}) => ({
  pollingIntervalMs: Math.max(
    pollingIntervalMs || ENCHANTED_LINK_MIN_POLLING_INTERVAL_MS,
    ENCHANTED_LINK_MIN_POLLING_INTERVAL_MS
  ),
  timeoutMs: Math.min(
    timeoutMs || ENCHANTED_LINK_MAX_POLLING_TIMEOUT_MS,
    ENCHANTED_LINK_MAX_POLLING_TIMEOUT_MS
  ),
});

const withEnchantedLink = (httpClient: HttpClient) => ({
  verify: withVerifyValidations(
    (token: string): Promise<SdkResponse<never>> =>
      transformResponse(
        httpClient.post(apiPaths.enchantedLink.verify, { token })
      )
  ),

  signIn: withSignValidations(
    (
      loginId: string,
      URI?: string,
      loginOptions?: LoginOptions,
      token?: string
    ): Promise<SdkResponse<EnchantedLinkResponse>> =>
      transformResponse(
        httpClient.post(
          pathJoin(apiPaths.enchantedLink.signIn, DeliveryMethods.email),
          {
            loginId,
            URI,
            loginOptions,
          },
          { token }
        )
      )
  ) as EnchantedLink[Routes.signIn],

  signUpOrIn: withSignValidations(
    (
      loginId: string,
      URI?: string
    ): Promise<SdkResponse<EnchantedLinkResponse>> =>
      transformResponse(
        httpClient.post(
          pathJoin(apiPaths.enchantedLink.signUpOrIn, DeliveryMethods.email),
          {
            loginId,
            URI,
          }
        )
      )
  ) as EnchantedLink[Routes.signIn],

  signUp: withSignValidations(
    (
      loginId: string,
      URI?: string,
      user?: User
    ): Promise<SdkResponse<EnchantedLinkResponse>> =>
      transformResponse(
        httpClient.post(
          pathJoin(apiPaths.enchantedLink.signUp, DeliveryMethods.email),
          {
            loginId,
            URI,
            user,
          }
        )
      )
  ) as EnchantedLink[Routes.signUp],

  waitForSession: withWaitForSessionValidations(
    (
      pendingRef: string,
      config?: WaitForSessionConfig
    ): Promise<SdkResponse<JWTResponse>> =>
      new Promise((resolve) => {
        const { pollingIntervalMs, timeoutMs } =
          normalizeWaitForSessionConfig(config);
        let timeout: number;
        const interval = setInterval(async () => {
          const resp = await httpClient.post(apiPaths.enchantedLink.session, {
            pendingRef,
          });
          if (resp.ok) {
            clearInterval(interval);
            if (timeout) clearTimeout(timeout);
            resolve(transformResponse(Promise.resolve(resp)));
          }
        }, pollingIntervalMs);

        timeout = setTimeout(() => {
          resolve({
            error: {
              errorDescription: `Session polling timeout exceeded: ${timeoutMs}ms`,
              errorCode: '0',
            },
            ok: false,
          });
          clearInterval(interval);
        }, timeoutMs);
      })
  ),

  update: {
    email: withUpdateEmailValidations(
      (
        loginId: string,
        email: string,
        URI?: string,
        token?: string
      ): Promise<SdkResponse<EnchantedLinkResponse>> =>
        transformResponse(
          httpClient.post(
            apiPaths.enchantedLink.update.email,
            { loginId, email, URI },
            { token }
          )
        )
    ),
  },
});

export default withEnchantedLink;
