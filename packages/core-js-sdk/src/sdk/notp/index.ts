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
      signUpOptions?: SignUpOptions,
    ): Promise<SdkResponse<NOTPResponse>> =>
      transformResponse(
        httpClient.post(apiPaths.notp.signUpOrIn, {
          loginId,
          loginOptions: signUpOptions,
        }),
      ),
  ),
  signUp: withSignValidations(
    (
      loginId?: string,
      user?: User,
      signUpOptions?: SignUpOptions,
    ): Promise<SdkResponse<NOTPResponse>> =>
      transformResponse(
        httpClient.post(apiPaths.notp.signUp, {
          loginId,
          user,
          loginOptions: signUpOptions,
        }),
      ),
  ),
  signIn: withSignValidations(
    (
      loginId?: string,
      loginOptions?: LoginOptions,
      token?: string,
    ): Promise<SdkResponse<NOTPResponse>> =>
      transformResponse(
        httpClient.post(
          apiPaths.notp.signIn,
          { loginId, loginOptions },
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
