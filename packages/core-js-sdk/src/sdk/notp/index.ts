import { apiPaths } from '../../constants';
import { HttpClient } from '../../httpClient';
import { transformResponse } from '../helpers';
import {
  JWTResponse,
  LoginOptions,
  SdkResponse,
  SignUpOptions,
  User,
} from '../types';
import { stringNonEmpty, string, withValidations } from '../validations';
import { NOTPResponse } from './types';

const loginIdValidations = string('loginId');

const withSignValidations = withValidations(loginIdValidations);
export const withWaitForSessionValidations = withValidations(
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
  // ASAF - add poll?
  getSession: withWaitForSessionValidations(
    (pendingRef: string): Promise<SdkResponse<SdkResponse<JWTResponse>>> =>
      transformResponse(
        httpClient.post(apiPaths.notp.session, {
          pendingRef,
        }),
      ),
  ),
});

export default withNotp;
