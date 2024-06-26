import {
  apiPaths,
  MAX_POLLING_TIMEOUT_MS,
  MIN_POLLING_INTERVAL_MS,
} from '../../constants';
import { HttpClient } from '../../httpClient';
import { normalizeWaitForSessionConfig } from '../../utils';
import { pathJoin, transformResponse } from '../helpers';
import {
  DeliveryMethods,
  SdkResponse,
  JWTResponse,
  EnchantedLinkResponse,
  User,
  LoginOptions,
  UpdateOptions,
  SignUpOptions,
  WaitForSessionConfig,
} from '../types';
import {
  withWaitForSessionValidations,
  withSignValidations,
  withVerifyValidations,
  withUpdateEmailValidations,
} from './validations';

const withEnchantedLink = (httpClient: HttpClient) => ({
  verify: withVerifyValidations(
    (token: string): Promise<SdkResponse<never>> =>
      transformResponse(
        httpClient.post(apiPaths.enchantedLink.verify, { token }),
      ),
  ),

  signIn: withSignValidations(
    (
      loginId: string,
      URI?: string,
      loginOptions?: LoginOptions,
      token?: string,
    ): Promise<SdkResponse<EnchantedLinkResponse>> =>
      transformResponse(
        httpClient.post(
          pathJoin(apiPaths.enchantedLink.signIn, DeliveryMethods.email),
          {
            loginId,
            URI,
            loginOptions,
          },
          { token },
        ),
      ),
  ),

  signUpOrIn: withSignValidations(
    (
      loginId: string,
      URI?: string,
      signUpOptions?: SignUpOptions,
    ): Promise<SdkResponse<EnchantedLinkResponse>> =>
      transformResponse(
        httpClient.post(
          pathJoin(apiPaths.enchantedLink.signUpOrIn, DeliveryMethods.email),
          {
            loginId,
            URI,
            loginOptions: signUpOptions,
          },
        ),
      ),
  ),

  signUp: withSignValidations(
    (
      loginId: string,
      URI?: string,
      user?: User,
      signUpOptions?: SignUpOptions,
    ): Promise<SdkResponse<EnchantedLinkResponse>> =>
      transformResponse(
        httpClient.post(
          pathJoin(apiPaths.enchantedLink.signUp, DeliveryMethods.email),
          {
            loginId,
            URI,
            user,
            loginOptions: signUpOptions,
          },
        ),
      ),
  ),

  waitForSession: withWaitForSessionValidations(
    (
      pendingRef: string,
      config?: WaitForSessionConfig,
    ): Promise<SdkResponse<JWTResponse>> =>
      new Promise((resolve) => {
        const { pollingIntervalMs, timeoutMs } =
          normalizeWaitForSessionConfig(config);
        let timeout: NodeJS.Timeout | undefined;
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
      }),
  ),

  update: {
    email: withUpdateEmailValidations(
      <T extends boolean>(
        loginId: string,
        email: string,
        URI?: string,
        token?: string,
        updateOptions?: UpdateOptions<T>,
      ): Promise<SdkResponse<EnchantedLinkResponse>> =>
        transformResponse(
          httpClient.post(
            apiPaths.enchantedLink.update.email,
            { loginId, email, URI, ...updateOptions },
            { token },
          ),
        ),
    ),
  },
});

export default withEnchantedLink;
