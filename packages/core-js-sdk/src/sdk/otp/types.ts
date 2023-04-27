import {
  Deliveries,
  User,
  SdkResponse,
  JWTResponse,
  MaskedPhone,
  MaskedEmail,
  ResponseData,
  DeliveriesMap,
  DeliveriesPhone,
  UpdateOptions,
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

type UpdatePhoneFn = <T extends boolean>(
  loginId: string,
  phone: string,
  token?: string,
  updateOptions? : UpdateOptions<T>
) => Promise<SdkResponse<MaskedPhone>>;

export enum Routes {
  signUp = 'signup',
  signIn = 'signin',
  verify = 'verify',
  updatePhone = 'updatePhone',
}

export type Otp = {
  [Routes.verify]: Deliveries<VerifyFn>;
  [Routes.signIn]: Deliveries<DeliveriesSignIn>;
  [Routes.signUp]: Deliveries<DeliveriesSignUp>;
  [Routes.updatePhone]: DeliveriesPhone<UpdatePhoneFn>;
};
