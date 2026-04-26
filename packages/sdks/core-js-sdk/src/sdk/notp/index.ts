import { apiPaths } from '../../constants';
import { HttpClient } from '../../httpClient';
import { normalizeWaitForSessionConfig } from '../../utils';
import { transformResponse } from '../helpers';
import {
  JWTResponse,
  LoginOptions,
  SdkResponse,
  SignUpOptions,
  User,
  WaitForSessionConfig,
} from '../types';
import { stringNonEmpty, string, withValidations } from '../validations';
import { NOTPResponse } from './types';

const loginIdValidations = string('loginId');

const withSignValidations = withValidations(loginIdValidations);

const withWaitForSessionValidations = withValidations(
  stringNonEmpty('pendingRef'),
);

const withNotp = (httpClient: HttpClient) => ({
  signUpOrIn: withSignValidations(
    (
      loginId?: string,
      {
        providerId,
        ...signUpOptions
      }: SignUpOptions & { providerId?: string } = {},
    ): Promise<SdkResponse<NOTPResponse>> =>
      transformResponse(
        httpClient.post(apiPaths.notp.signUpOrIn, {
          loginId,
          loginOptions: signUpOptions,
          providerId,
        }),
      ),
  ),
  signUp: withSignValidations(
    (
      loginId?: string,
      user?: User,
      {
        providerId,
        ...signUpOptions
      }: SignUpOptions & { providerId?: string } = {},
    ): Promise<SdkResponse<NOTPResponse>> =>
      transformResponse(
        httpClient.post(apiPaths.notp.signUp, {
          loginId,
          user,
          providerId,
          loginOptions: signUpOptions,
        }),
      ),
  ),
  signIn: withSignValidations(
    (
      loginId?: string,
      {
        providerId,
        ...loginOptions
      }: LoginOptions & { providerId?: string } = {},
      token?: string,
    ): Promise<SdkResponse<NOTPResponse>> =>
      transformResponse(
        httpClient.post(
          apiPaths.notp.signIn,
          { loginId, loginOptions, providerId },
          { token },
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
          const resp = await httpClient.post(apiPaths.notp.session, {
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
});

export default withNotp;
