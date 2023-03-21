import { apiPaths } from '../constants';
import { HttpClient } from '../httpClient';
import { transformResponse } from './helpers';
import {
  User,
  SdkResponse,
  JWTResponse,
  TOTPResponse,
  LoginOptions,
} from './types';
import { stringNonEmpty, withValidations } from './validations';

const loginIdValidations = stringNonEmpty('loginId');
const withVerifyValidations = withValidations(
  loginIdValidations,
  stringNonEmpty('code')
);
const withSignUpValidations = withValidations(loginIdValidations);
const withUpdateValidations = withValidations(loginIdValidations);

const withTotp = (httpClient: HttpClient) => ({
  signUp: withSignUpValidations(
    (loginId: string, user?: User): Promise<SdkResponse<TOTPResponse>> =>
      transformResponse(
        httpClient.post(apiPaths.totp.signUp, { loginId, user })
      )
  ),

  verify: withVerifyValidations(
    (
      loginId: string,
      code: string,
      loginOptions?: LoginOptions,
      token?: string
    ): Promise<SdkResponse<JWTResponse>> =>
      transformResponse(
        httpClient.post(
          apiPaths.totp.verify,
          { loginId, code, loginOptions },
          { token }
        )
      )
  ),

  update: withUpdateValidations(
    (loginId: string, token?: string): Promise<SdkResponse<TOTPResponse>> =>
      transformResponse(
        httpClient.post(apiPaths.totp.update, { loginId }, { token })
      )
  ),
});

export default withTotp;
