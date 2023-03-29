import {
  Deliveries,
  User,
  SdkResponse,
  JWTResponse,
  MaskedPhone,
  MaskedEmail,
  ResponseData,
  DeliveriesMap,
} from '../types';

type VerifyFn = (
  loginId: string,
  code: string
) => Promise<SdkResponse<JWTResponse>>;

type SignInFn<T extends ResponseData> = (
  loginId: string
) => Promise<SdkResponse<T>>;

type SignUpFn<T extends ResponseData> = (
  loginId: string,
  user?: User
) => Promise<SdkResponse<T>>;

type DeliveriesSignIn = DeliveriesMap<
  SignInFn<MaskedEmail>,
  SignInFn<MaskedPhone>
>;

type DeliveriesSignUp = DeliveriesMap<
  SignUpFn<MaskedEmail>,
  SignUpFn<MaskedPhone>
>;

export enum Routes {
  signUp = 'signup',
  signIn = 'signin',
  verify = 'verify',
}

export type Otp = {
  [Routes.verify]: Deliveries<VerifyFn>;
  [Routes.signIn]: Deliveries<DeliveriesSignIn>;
  [Routes.signUp]: Deliveries<DeliveriesSignUp>;
};
