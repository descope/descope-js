import {
  Deliveries,
  SdkResponse,
  User,
  MaskedAddress,
  DeliveryMethods,
} from '../types';

export type SignInFn<T> = (
  loginId: string,
  uri: string
) => Promise<SdkResponse<MaskedAddress<T>>>;
export type SignUpFn<T> = (
  loginId: string,
  uri: string,
  user?: User
) => Promise<SdkResponse<MaskedAddress<T>>>;
export type UpdatePhoneFn = (
  loginId: string,
  phone: string
) => Promise<SdkResponse<MaskedAddress<DeliveryMethods.sms>>>;

export enum Routes {
  signUp = 'signup',
  signIn = 'signin',
  updatePhone = 'updatePhone',
}

export type MagicLink = {
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
