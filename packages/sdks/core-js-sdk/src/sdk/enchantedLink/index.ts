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

// Enchanted Link currently supports delivery by email or SMS (unlike Magic Link, which also supports whatsapp)
const deliveryMethods = [DeliveryMethods.email, DeliveryMethods.sms];

type EnchantedLinkDeliveryMethod =
  | typeof DeliveryMethods.email
  | typeof DeliveryMethods.sms;

type EnchantedLinkSignInFn = (
  loginId: string,
  URI?: string,
  loginOptions?: LoginOptions & { providerId?: string },
  token?: string,
) => Promise<SdkResponse<EnchantedLinkResponse>>;

type EnchantedLinkSignUpFn = (
  loginId: string,
  URI?: string,
  user?: User,
  signUpOptions?: SignUpOptions & { providerId?: string },
) => Promise<SdkResponse<EnchantedLinkResponse>>;

type EnchantedLinkSignUpOrInFn = (
  loginId: string,
  URI?: string,
  signUpOptions?: SignUpOptions & { providerId?: string },
) => Promise<SdkResponse<EnchantedLinkResponse>>;

const withEnchantedLink = (httpClient: HttpClient) => ({
  verify: withVerifyValidations(
    (token: string): Promise<SdkResponse<never>> =>
      transformResponse(
        httpClient.post(apiPaths.enchantedLink.verify, { token }),
      ),
  ),

  signIn: deliveryMethods.reduce(
    (acc, delivery) => ({
      ...acc,
      [delivery]: withSignValidations(
        (
          loginId: string,
          URI?: string,
          {
            providerId,
            ...loginOptions
          }: LoginOptions & { providerId?: string } = {},
          token?: string,
        ) =>
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
          ),
      ),
    }),
    {},
  ) as Record<EnchantedLinkDeliveryMethod, EnchantedLinkSignInFn>,

  signUpOrIn: deliveryMethods.reduce(
    (acc, delivery) => ({
      ...acc,
      [delivery]: withSignValidations(
        (
          loginId: string,
          URI?: string,
          {
            providerId,
            ...signUpOptions
          }: SignUpOptions & { providerId?: string } = {},
        ) =>
          transformResponse(
            httpClient.post(
              pathJoin(apiPaths.enchantedLink.signUpOrIn, delivery),
              {
                loginId,
                URI,
                loginOptions: signUpOptions,
                providerId,
              },
            ),
          ),
      ),
    }),
    {},
  ) as Record<EnchantedLinkDeliveryMethod, EnchantedLinkSignUpOrInFn>,

  signUp: deliveryMethods.reduce(
    (acc, delivery) => ({
      ...acc,
      [delivery]: withSignValidations(
        (
          loginId: string,
          URI?: string,
          user?: User,
          {
            providerId,
            ...signUpOptions
          }: SignUpOptions & { providerId?: string } = {},
        ) =>
          transformResponse(
            httpClient.post(pathJoin(apiPaths.enchantedLink.signUp, delivery), {
              loginId,
              URI,
              user,
              loginOptions: signUpOptions,
              providerId,
            }),
          ),
      ),
    }),
    {},
  ) as Record<EnchantedLinkDeliveryMethod, EnchantedLinkSignUpFn>,

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
