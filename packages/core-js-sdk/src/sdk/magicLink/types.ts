import {
  Deliveries,
  SdkResponse,
  User,
  ResponseData,
  DeliveriesMap,
  MaskedEmail,
  MaskedPhone,
  DeliveriesPhone,
  UpdateOptions,
  SignUpOptions,
  LoginOptions,
} from '../types';

type SignInFn<T extends ResponseData> = (
  loginId: string,
  URI: string,
  loginOptions?: LoginOptions,
  token?: string,
) => Promise<SdkResponse<T>>;

type SignUpFn<T extends ResponseData> = (
  loginId: string,
  URI: string,
  user?: User,
  signUpOptions?: SignUpOptions,
) => Promise<SdkResponse<T>>;

type SignUpOrInFn<T extends ResponseData> = (
  loginId: string,
  URI?: string,
  signUpOptions?: SignUpOptions,
) => Promise<SdkResponse<T>>;

type UpdatePhoneFn = <T extends boolean>(
  loginId: string,
  phone: string,
  URI?: string,
  token?: string,
  updateOptions?: UpdateOptions<T>,
) => Promise<SdkResponse<MaskedPhone>>;

type DeliveriesSignIn = DeliveriesMap<
  SignInFn<MaskedEmail>,
  SignInFn<MaskedPhone>
>;

type DeliveriesSignUp = DeliveriesMap<
  SignUpFn<MaskedEmail>,
  SignUpFn<MaskedPhone>
>;

type DeliveriesSignUpOrIn = DeliveriesMap<
  SignUpOrInFn<MaskedEmail>,
  SignUpOrInFn<MaskedPhone>
>;

export enum Routes {
  signUp = 'signup',
  signIn = 'signin',
  signUpOrIn = 'signuporin',
  updatePhone = 'updatePhone',
}

export type MagicLink = {
  [Routes.signIn]: Deliveries<DeliveriesSignIn>;
  [Routes.signUp]: Deliveries<DeliveriesSignUp>;
  [Routes.signUpOrIn]: Deliveries<DeliveriesSignUpOrIn>;
  [Routes.updatePhone]: DeliveriesPhone<UpdatePhoneFn>;
};
