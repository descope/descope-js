import { apiPaths } from '../../constants';
import { HttpClient } from '../../httpClient';
import { pathJoin, transformResponse } from '../helpers';
import {
  DeliveryMethods,
  User,
  SdkResponse,
  JWTResponse,
  DeliveryPhone,
  LoginOptions,
  MaskedEmail,
} from '../types';
import {
  stringEmail,
  stringNonEmpty,
  stringPhone,
  withValidations,
} from '../validations';
import { Otp, Routes } from './types';

const loginIdValidations = stringNonEmpty('loginId');
const withVerifyValidations = withValidations(
  loginIdValidations,
  stringNonEmpty('code')
);
const withSignValidations = withValidations(loginIdValidations);
const withUpdatePhoneValidations = withValidations(
  loginIdValidations,
  stringPhone('phone')
);
const withUpdateEmailValidations = withValidations(
  loginIdValidations,
  stringEmail('email')
);

const withOtp = (httpClient: HttpClient) => ({
  verify: Object.keys(DeliveryMethods).reduce(
    (acc, delivery) => ({
      ...acc,
      [delivery]: withVerifyValidations(
        (loginId: string, code: string): Promise<SdkResponse<JWTResponse>> =>
          transformResponse(
            httpClient.post(pathJoin(apiPaths.otp.verify, delivery), {
              code,
              loginId,
            })
          )
      ),
    }),
    {}
  ) as Otp[Routes.verify],

  signIn: Object.keys(DeliveryMethods).reduce(
    (acc, delivery) => ({
      ...acc,
      [delivery]: withSignValidations(
        (loginId: string, loginOptions?: LoginOptions, token?: string) =>
          transformResponse(
            httpClient.post(
              pathJoin(apiPaths.otp.signIn, delivery),
              { loginId, loginOptions },
              { token }
            )
          )
      ),
    }),
    {}
  ) as Otp[Routes.signIn],

  signUp: Object.keys(DeliveryMethods).reduce(
    (acc, delivery) => ({
      ...acc,
      [delivery]: withSignValidations((loginId: string, user?: User) =>
        transformResponse(
          httpClient.post(pathJoin(apiPaths.otp.signUp, delivery), {
            loginId,
            user,
          })
        )
      ),
    }),
    {}
  ) as Otp[Routes.signUp],

  signUpOrIn: Object.keys(DeliveryMethods).reduce(
    (acc, delivery) => ({
      ...acc,
      [delivery]: withSignValidations((loginId: string) =>
        transformResponse(
          httpClient.post(pathJoin(apiPaths.otp.signUpOrIn, delivery), {
            loginId,
          })
        )
      ),
    }),
    {}
  ) as Otp[Routes.signIn],

  update: {
    email: withUpdateEmailValidations(
      (
        loginId: string,
        email: string,
        token?: string,
        addToLoginIDs?: boolean,
        onMergeUseExisting?: boolean
      ): Promise<SdkResponse<MaskedEmail>> =>
        transformResponse(
          httpClient.post(
            apiPaths.otp.update.email,
            { loginId, email, addToLoginIDs, onMergeUseExisting },
            { token }
          )
        )
    ),
    phone: Object.keys(DeliveryPhone).reduce(
      (acc, delivery) => ({
        ...acc,
        [delivery]: withUpdatePhoneValidations(
          (
            loginId: string,
            phone: string,
            token?: string,
            addToLoginIDs?: boolean,
            onMergeUseExisting?: boolean
          ) =>
            transformResponse(
              httpClient.post(
                pathJoin(apiPaths.otp.update.phone, delivery),
                { loginId, phone, addToLoginIDs, onMergeUseExisting },
                { token }
              )
            )
        ),
      }),
      {}
    ) as Otp[Routes.updatePhone],
  },
});

export default withOtp;
