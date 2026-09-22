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
  DeliveryPhone,
  SdkResponse,
  JWTResponse,
  EnchantedLinkResponse,
  PhoneEnchantedLinkResponse,
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
  withUpdatePhoneValidations,
} from './validations';

const withEnchantedLink = (httpClient: HttpClient) => {
  const postSignIn =
    <T extends ResponseData>(delivery: DeliveryMethods) =>
    (
      loginId: string,
      URI?: string,
      {
        providerId,
        ...loginOptions
      }: LoginOptions & { providerId?: string } = {},
      token?: string,
    ): Promise<SdkResponse<T>> =>
      transformResponse(
        httpClient.post(
          pathJoin(apiPaths.enchantedLink.signIn, delivery),
          {
            loginId,
            URI,
            loginOptions,
            providerId,
          },
          { token },
        ),
      );

  const postSignUpOrIn =
    <T extends ResponseData>(delivery: DeliveryMethods) =>
    (
      loginId: string,
      URI?: string,
      {
        providerId,
        ...signUpOptions
      }: SignUpOptions & { providerId?: string } = {},
    ): Promise<SdkResponse<T>> =>
      transformResponse(
        httpClient.post(pathJoin(apiPaths.enchantedLink.signUpOrIn, delivery), {
          loginId,
          URI,
          loginOptions: signUpOptions,
          providerId,
        }),
      );

  const postSignUp =
    <T extends ResponseData>(delivery: DeliveryMethods) =>
    (
      loginId: string,
      URI?: string,
      user?: User,
      {
        providerId,
        ...signUpOptions
      }: SignUpOptions & { providerId?: string } = {},
    ): Promise<SdkResponse<T>> =>
      transformResponse(
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
      postSignIn<EnchantedLinkResponse>(DeliveryMethods.email),
    ),

    /** Send an enchanted link over SMS to sign an existing user in */
    signInWithPhone: withSignValidations(
      postSignIn<PhoneEnchantedLinkResponse>(DeliveryPhone.sms),
    ),

    signUpOrIn: withSignValidations(
      postSignUpOrIn<EnchantedLinkResponse>(DeliveryMethods.email),
    ),

    /** Send an enchanted link over SMS to sign a user up or in */
    signUpOrInWithPhone: withSignValidations(
      postSignUpOrIn<PhoneEnchantedLinkResponse>(DeliveryPhone.sms),
    ),

    signUp: withSignValidations(
      postSignUp<EnchantedLinkResponse>(DeliveryMethods.email),
    ),

    /** Send an enchanted link over SMS to sign a new user up */
    signUpWithPhone: withSignValidations(
      postSignUp<PhoneEnchantedLinkResponse>(DeliveryPhone.sms),
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
      phone: {
        sms: withUpdatePhoneValidations(
          <T extends boolean>(
            loginId: string,
            phone: string,
            URI?: string,
            token?: string,
            updateOptions?: UpdateOptions<T>,
          ): Promise<SdkResponse<PhoneEnchantedLinkResponse>> =>
            transformResponse(
              httpClient.post(
                pathJoin(
                  apiPaths.enchantedLink.update.phone,
                  DeliveryPhone.sms,
                ),
                { loginId, phone, URI, ...updateOptions },
                { token },
              ),
            ),
        ),
      },
    },
  };
};

export default withEnchantedLink;
