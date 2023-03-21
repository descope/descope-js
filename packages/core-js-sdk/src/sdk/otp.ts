import { apiPaths } from '../constants';
import { HttpClient } from '../httpClient';
import { pathJoin, transformResponse } from './helpers';
import {
  DeliveryMethods,
  Deliveries,
  User,
  SdkResponse,
  JWTResponse,
  DeliveryPhone,
  LoginOptions,
  MaskedAddress,
} from './types';
import {
  stringEmail,
  stringNonEmpty,
  stringPhone,
  withValidations,
} from './validations';

enum Routes {
  signUp = 'signup',
  signIn = 'signin',
  verify = 'verify',
  updatePhone = 'updatePhone',
}

type VerifyFn = (
  loginId: string,
  code: string
) => Promise<SdkResponse<JWTResponse>>;
type SignInFn<T> = (loginId: string) => Promise<SdkResponse<MaskedAddress<T>>>;
type SignUpFn<T> = (
  loginId: string,
  user?: User
) => Promise<SdkResponse<MaskedAddress<T>>>;
type UpdatePhoneFn = (
  loginId: string,
  phone: string
) => Promise<SdkResponse<MaskedAddress<DeliveryMethods.sms>>>;

type Otp = {
  [Routes.verify]: Deliveries<VerifyFn>;
  [Routes.signIn]: {
    [DeliveryMethods.email]: SignInFn<DeliveryMethods.email>;
    [DeliveryMethods.sms]: SignInFn<DeliveryMethods.sms>;
    [DeliveryMethods.whatsapp]: SignInFn<DeliveryMethods.whatsapp>;
  };
  [Routes.signUp]: {
    [DeliveryMethods.email]: SignUpFn<DeliveryMethods.email>;
    [DeliveryMethods.sms]: SignUpFn<DeliveryMethods.sms>;
    [DeliveryMethods.whatsapp]: SignUpFn<DeliveryMethods.whatsapp>;
  };
  [Routes.updatePhone]: Deliveries<UpdatePhoneFn>;
};

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
        (
          loginId: string,
          loginOptions?: LoginOptions,
          token?: string
        ): Promise<SdkResponse<MaskedAddress<typeof delivery>>> =>
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
      [delivery]: withSignValidations(
        (
          loginId: string,
          user?: User
        ): Promise<SdkResponse<MaskedAddress<typeof delivery>>> =>
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
      [delivery]: withSignValidations(
        (
          loginId: string
        ): Promise<SdkResponse<MaskedAddress<typeof delivery>>> =>
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
        token?: string
      ): Promise<SdkResponse<MaskedAddress<DeliveryMethods.email>>> =>
        transformResponse(
          httpClient.post(
            apiPaths.otp.update.email,
            { loginId, email },
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
            token?: string
          ): Promise<SdkResponse<MaskedAddress<DeliveryMethods.sms>>> =>
            transformResponse(
              httpClient.post(
                pathJoin(apiPaths.otp.update.phone, delivery),
                { loginId, phone },
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
