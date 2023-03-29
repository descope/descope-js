import {
  Deliveries,
  SdkResponse,
  User,
  ResponseData,
  DeliveriesMap,
  MaskedEmail,
  MaskedPhone,
  DeliveriesPhone,
} from '../types';

type SignInFn<T extends ResponseData> = (
  loginId: string,
  uri: string
) => Promise<SdkResponse<T>>;

type SignUpFn<T extends ResponseData> = (
  loginId: string,
  uri: string,
  user?: User
) => Promise<SdkResponse<T>>;

type UpdatePhoneFn = (
  loginId: string,
  phone: string,
  URI?: string,
  token?: string
) => Promise<SdkResponse<MaskedPhone>>;

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
  updatePhone = 'updatePhone',
}

export type MagicLink = {
  [Routes.signIn]: Deliveries<DeliveriesSignIn>;
  [Routes.signUp]: Deliveries<DeliveriesSignUp>;
  [Routes.updatePhone]: DeliveriesPhone<UpdatePhoneFn>;
};
