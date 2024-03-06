import { apiPaths } from '../../constants';
import { HttpClient } from '../../httpClient';
import { transformResponse } from '../helpers';
import {
  JWTResponse,
  SdkResponse,
  SignUpOptions,
} from '../types';
import {
  stringNonEmpty,
  withValidations,
} from '../validations';
import { NOTPResponse } from './types';

const loginIdValidations = stringNonEmpty('loginId');

const withSignValidations = withValidations(loginIdValidations);
export const withWaitForSessionValidations = withValidations(
  stringNonEmpty('pendingRef')
);

const withNotp = (httpClient: HttpClient) => ({
  signUpOrIn: withSignValidations(
    (
      loginId: string,
      signUpOptions?: SignUpOptions,
    ): Promise<SdkResponse<NOTPResponse>> =>
      transformResponse(
        httpClient.post(apiPaths.notp.signUpOrIn, {
          loginId,
          loginOptions: signUpOptions,
        }),
      ),
  ),
  // ASAF - change this to poll
  getSession: withWaitForSessionValidations(
    (
      pendingRef: string,
    ): Promise<SdkResponse<SdkResponse<JWTResponse>>> =>
      transformResponse(
        httpClient.post(apiPaths.notp.session, {
          pendingRef,
        }),
      ),
  ),
});

export default withNotp;
