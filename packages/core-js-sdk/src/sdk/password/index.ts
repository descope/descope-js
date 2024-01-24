import { apiPaths } from '../../constants';
import { HttpClient } from '../../httpClient';
import { transformResponse } from '../helpers';
import {
  withSignValidations,
  withSendResetValidations,
  withUpdateValidation,
  withReplaceValidation,
} from './validations';
import {
  SdkResponse,
  JWTResponse,
  User,
  PasswordResetResponse,
  PasswordPolicyResponse,
  TemplateOptions,
} from '../types';

const withPassword = (httpClient: HttpClient) => ({
  signUp: withSignValidations(
    (
      loginId: string,
      password: string,
      user?: User,
    ): Promise<SdkResponse<JWTResponse>> =>
      transformResponse(
        httpClient.post(apiPaths.password.signUp, {
          loginId,
          password,
          user,
        }),
      ),
  ),

  signIn: withSignValidations(
    (loginId: string, password: string): Promise<SdkResponse<JWTResponse>> =>
      transformResponse(
        httpClient.post(apiPaths.password.signIn, {
          loginId,
          password,
        }),
      ),
  ),

  sendReset: withSendResetValidations(
    (
      loginId: string,
      redirectUrl?: string,
      templateOptions?: TemplateOptions,
    ): Promise<SdkResponse<PasswordResetResponse>> =>
      transformResponse(
        httpClient.post(apiPaths.password.sendReset, {
          loginId,
          redirectUrl,
          templateOptions,
        }),
      ),
  ),

  update: withUpdateValidation(
    (
      loginId: string,
      newPassword: string,
      token?: string,
    ): Promise<SdkResponse<never>> =>
      transformResponse(
        httpClient.post(
          apiPaths.password.update,
          {
            loginId,
            newPassword,
          },
          { token },
        ),
      ),
  ),

  replace: withReplaceValidation(
    (
      loginId: string,
      oldPassword: string,
      newPassword: string,
    ): Promise<SdkResponse<JWTResponse>> =>
      transformResponse(
        httpClient.post(apiPaths.password.replace, {
          loginId,
          oldPassword,
          newPassword,
        }),
      ),
  ),

  policy: (): Promise<SdkResponse<PasswordPolicyResponse>> =>
    transformResponse(httpClient.get(apiPaths.password.policy)),
});

export default withPassword;
