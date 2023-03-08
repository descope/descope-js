import { Deliveries, SdkResponse, User } from '../types';

export type SignInFn = (loginId: string, uri: string) => Promise<SdkResponse<never>>;
export type SignUpFn = (loginId: string, uri: string, user?: User) => Promise<SdkResponse<never>>;
export type UpdatePhoneFn = (loginId: string, phone: string) => Promise<SdkResponse<never>>;

export enum Routes {
	signUp = 'signup',
	signIn = 'signin',
	updatePhone = 'updatePhone'
}

export type MagicLink = {
	[Routes.signIn]: Deliveries<SignInFn>;
	[Routes.signUp]: Deliveries<SignUpFn>;
	[Routes.updatePhone]: Deliveries<UpdatePhoneFn>;
};
