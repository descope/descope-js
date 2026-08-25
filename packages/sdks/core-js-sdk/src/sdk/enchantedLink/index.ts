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
  EnchantedLinkPhoneResponse,
  ResponseData,
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

const withEnchantedLink = (httpClient: HttpClient) => {
  // Shared request builders, parameterized by delivery method. The public signIn/signUp/signUpOrIn
  // keep their original email-only signatures; the SMS variants are additive siblings so existing
  // callers are unaffected.
  const postSignIn = <T extends ResponseData>(
    delivery: DeliveryMethods,
    loginId: string,
    URI?: string,
    {
      providerId,
      ...loginOptions
    }: LoginOptions & { providerId?: string } = {},
    token?: string,
  ): Promise<SdkResponse<T>> =>
    transformResponse<T>(
      httpClient.post(
        pathJoin(apiPaths.enchantedLink.signIn, delivery),
        { loginId, URI, loginOptions, providerId },
        { token },
      ),
    );

  const postSignUpOrIn = <T extends ResponseData>(
    delivery: DeliveryMethods,
    loginId: string,
    URI?: string,
    {
      providerId,
      ...signUpOptions
    }: SignUpOptions & { providerId?: string } = {},
  ): Promise<SdkResponse<T>> =>
    transformResponse<T>(
      httpClient.post(pathJoin(apiPaths.enchantedLink.signUpOrIn, delivery), {
        loginId,
        URI,
        loginOptions: signUpOptions,
        providerId,
      }),
    );

  const postSignUp = <T extends ResponseData>(
    delivery: DeliveryMethods,
    loginId: string,
    URI?: string,
    user?: User,
    {
      providerId,
      ...signUpOptions
    }: SignUpOptions & { providerId?: string } = {},
  ): Promise<SdkResponse<T>> =>
    transformResponse<T>(
      httpClient.post(pathJoin(apiPaths.enchantedLink.signUp, delivery), {
        loginId,
        URI,
        user,
        loginOptions: signUpOptions,
        providerId,
      }),
    );

  return {
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
        loginOptions?: LoginOptions & { providerId?: string },
        token?: string,
      ): Promise<SdkResponse<EnchantedLinkResponse>> =>
        postSignIn<EnchantedLinkResponse>(
          DeliveryMethods.email,
          loginId,
          URI,
          loginOptions,
          token,
        ),
    ),

    signInSMS: withSignValidations(
      (
        loginId: string,
        URI?: string,
        loginOptions?: LoginOptions & { providerId?: string },
        token?: string,
      ): Promise<SdkResponse<EnchantedLinkPhoneResponse>> =>
        postSignIn<EnchantedLinkPhoneResponse>(
          DeliveryMethods.sms,
          loginId,
          URI,
          loginOptions,
          token,
        ),
    ),

    signUpOrIn: withSignValidations(
      (
        loginId: string,
        URI?: string,
        signUpOptions?: SignUpOptions & { providerId?: string },
      ): Promise<SdkResponse<EnchantedLinkResponse>> =>
        postSignUpOrIn<EnchantedLinkResponse>(
          DeliveryMethods.email,
          loginId,
          URI,
          signUpOptions,
        ),
    ),

    signUpOrInSMS: withSignValidations(
      (
        loginId: string,
        URI?: string,
        signUpOptions?: SignUpOptions & { providerId?: string },
      ): Promise<SdkResponse<EnchantedLinkPhoneResponse>> =>
        postSignUpOrIn<EnchantedLinkPhoneResponse>(
          DeliveryMethods.sms,
          loginId,
          URI,
          signUpOptions,
        ),
    ),

    signUp: withSignValidations(
      (
        loginId: string,
        URI?: string,
        user?: User,
        signUpOptions?: SignUpOptions & { providerId?: string },
      ): Promise<SdkResponse<EnchantedLinkResponse>> =>
        postSignUp<EnchantedLinkResponse>(
          DeliveryMethods.email,
          loginId,
          URI,
          user,
          signUpOptions,
        ),
    ),

    signUpSMS: withSignValidations(
      (
        loginId: string,
        URI?: string,
        user?: User,
        signUpOptions?: SignUpOptions & { providerId?: string },
      ): Promise<SdkResponse<EnchantedLinkPhoneResponse>> =>
        postSignUp<EnchantedLinkPhoneResponse>(
          DeliveryMethods.sms,
          loginId,
          URI,
          user,
          signUpOptions,
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
  };
};

export default withEnchantedLink;
