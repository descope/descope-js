import {
  Deliveries,
  SdkResponse,
  User,
  ResponseData,
  DeliveriesMap,
  MaskedEmail,
  MaskedPhone,
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
}

export type MagicLink = {
  [Routes.signIn]: Deliveries<DeliveriesSignIn>;
  [Routes.signUp]: Deliveries<DeliveriesSignUp>;
};
