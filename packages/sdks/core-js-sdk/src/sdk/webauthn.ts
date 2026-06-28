import { apiPaths } from '../constants';
import { HttpClient } from '../httpClient';
import { transformResponse } from './helpers';
import {
  SdkResponse,
  LoginOptions,
  JWTResponse,
  PasskeyOptions,
  WebAuthnStartResponse,
} from './types';
import {
  isStringOrUndefinedValidator,
  string,
  stringNonEmpty,
  withValidations,
} from './validations';

const loginIdStringValidations = string('loginId');
const loginIdNonEmptyValidations = stringNonEmpty('loginId');
const originValidations = stringNonEmpty('origin');

const withSignUpStartValidations = withValidations(
  loginIdNonEmptyValidations,
  originValidations,
  stringNonEmpty('name'),
);
const withSignUpOrInStartValidations = withValidations(
  loginIdNonEmptyValidations,
  originValidations,
);
const withSignInStartValidations = withValidations(
  loginIdStringValidations,
  originValidations,
);
const withUpdateStartValidations = withValidations(
  loginIdNonEmptyValidations,
  originValidations,
  isStringOrUndefinedValidator('token'),
);
const withFinishValidations = withValidations(
  stringNonEmpty('transactionId'),
  stringNonEmpty('response'),
);

const withWebauthn = (httpClient: HttpClient) => ({
  signUp: {
    start: withSignUpStartValidations(
      (
        loginId: string,
        origin: string,
        name: string,
        passkeyOptions?: PasskeyOptions,
        loginOptions?: LoginOptions,
      ): Promise<SdkResponse<WebAuthnStartResponse>> => {
        return transformResponse(
          httpClient.post(apiPaths.webauthn.signUp.start, {
            user: {
              loginId,
              name,
            },
            origin,
            loginOptions,
            passkeyOptions,
          }),
        );
      },
    ),

    finish: withFinishValidations(
      (
        transactionId: string,
        response: string,
      ): Promise<SdkResponse<JWTResponse>> =>
        transformResponse(
          httpClient.post(apiPaths.webauthn.signUp.finish, {
            transactionId,
            response,
          }),
        ),
    ),
  },

  signIn: {
    start: withSignInStartValidations(
      (
        loginId: string,
        origin: string,
        loginOptions?: LoginOptions,
        token?: string,
        passkeyOptions?: PasskeyOptions,
      ): Promise<SdkResponse<WebAuthnStartResponse>> => {
        return transformResponse(
          httpClient.post(
            apiPaths.webauthn.signIn.start,
            {
              loginId,
              origin,
              loginOptions,
              passkeyOptions,
            },
            { token },
          ),
        );
      },
    ),

    finish: withFinishValidations(
      (
        transactionId: string,
        response: string,
      ): Promise<SdkResponse<JWTResponse>> =>
        transformResponse(
          httpClient.post(apiPaths.webauthn.signIn.finish, {
            transactionId,
            response,
          }),
        ),
    ),
  },

  signUpOrIn: {
    start: withSignUpOrInStartValidations(
      (
        loginId: string,
        origin: string,
        passkeyOptions?: PasskeyOptions,
        loginOptions?: LoginOptions,
      ): Promise<SdkResponse<WebAuthnStartResponse>> => {
        return transformResponse(
          httpClient.post(apiPaths.webauthn.signUpOrIn.start, {
            loginId,
            origin,
            loginOptions,
            passkeyOptions,
          }),
        );
      },
    ),
  },

  update: {
    start: withUpdateStartValidations(
      (
        loginId: string,
        origin: string,
        token?: string,
        passkeyOptions?: PasskeyOptions,
        mfa?: boolean,
      ): Promise<SdkResponse<WebAuthnStartResponse>> =>
        transformResponse(
          httpClient.post(
            apiPaths.webauthn.update.start,
            { loginId, origin, passkeyOptions, mfa },
            { token },
          ),
        ),
    ),

    // When the matching update.start set mfa, the response carries a session whose amr merges the user's
    // previously-passed factors with the new passkey, nested under `jwt`. For the default enrollment flow
    // `jwt` is absent (the credential is registered, no session minted).
    finish: withFinishValidations(
      (
        transactionId: string,
        response: string,
      ): Promise<SdkResponse<{ jwt?: JWTResponse }>> =>
        transformResponse(
          httpClient.post(apiPaths.webauthn.update.finish, {
            transactionId,
            response,
          }),
        ),
    ),
  },
});

export default withWebauthn;
