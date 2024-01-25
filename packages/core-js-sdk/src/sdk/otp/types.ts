import {
  User,
  SdkResponse,
  JWTResponse,
  MaskedPhone,
  MaskedEmail,
  ResponseData,
  DeliveriesMap,
  DeliveriesPhone,
  UpdateOptions,
  Deliveries,
  DeliveryMethods,
  SdkFn,
  LoginOptions,
  SignUpOptions,
} from '../types';

type VerifyFn = (
  loginId: string,
  code: string,
) => Promise<SdkResponse<JWTResponse>>;

type SignInFn<T extends ResponseData> = (
  loginId: string,
  loginOptions?: LoginOptions,
  token?: string,
) => Promise<SdkResponse<T>>;

type SignUpFn<T extends ResponseData> = (
  loginId: string,
  user?: User,
  signUpOptions?: SignUpOptions,
) => Promise<SdkResponse<T>>;

type SignUpOrInFn<T extends ResponseData> = (
  loginId: string,
  signUpOptions?: SignUpOptions,
) => Promise<SdkResponse<T>>;

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

type UpdatePhoneFn = <T extends boolean>(
  loginId: string,
  phone: string,
  token?: string,
  updateOptions?: UpdateOptions<T>,
) => Promise<SdkResponse<MaskedPhone>>;

// We locate this here because if we put it in types.ts
// The declaration of the type will not work well along with other utility types such as ReplacePaths
// If this type is needed elsewhere, we should find a better solution for it
// Note that this issue manifests itself when this type is exported. see https://github.com/descope/node-sdk/pull/184
type DeliveriesWithFunc<T extends SdkFn> = {
  [S in DeliveryMethods]: T;
};

export enum Routes {
  signUp = 'signup',
  signIn = 'signin',
  signInOrIn = 'signuporin',
  verify = 'verify',
  updatePhone = 'updatePhone',
}

export type Otp = {
  [Routes.verify]: DeliveriesWithFunc<VerifyFn>;
  [Routes.signIn]: Deliveries<DeliveriesSignIn>;
  [Routes.signUp]: Deliveries<DeliveriesSignUp>;
  [Routes.signInOrIn]: Deliveries<DeliveriesSignUpOrIn>;
  [Routes.updatePhone]: DeliveriesPhone<UpdatePhoneFn>;
};
