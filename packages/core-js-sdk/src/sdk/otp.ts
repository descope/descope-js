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
	LoginOptions
} from './types';
import { stringEmail, stringNonEmpty, stringPhone, withValidations } from './validations';

enum Routes {
	signUp = 'signup',
	signIn = 'signin',
	verify = 'verify',
	updatePhone = 'updatePhone'
}

type VerifyFn = (loginId: string, code: string) => Promise<SdkResponse<JWTResponse>>;
type SignInFn = (loginId: string) => Promise<SdkResponse<never>>;
type SignUpFn = (loginId: string, user?: User) => Promise<SdkResponse<never>>;
type UpdatePhoneFn = (loginId: string, phone: string) => Promise<SdkResponse<never>>;

type Otp = {
	[Routes.verify]: Deliveries<VerifyFn>;
	[Routes.signIn]: Deliveries<SignInFn>;
	[Routes.signUp]: Deliveries<SignUpFn>;
	[Routes.updatePhone]: Deliveries<UpdatePhoneFn>;
};

const loginIdValidations = stringNonEmpty('loginId');
const withVerifyValidations = withValidations(loginIdValidations, stringNonEmpty('code'));
const withSignValidations = withValidations(loginIdValidations);
const withUpdatePhoneValidations = withValidations(loginIdValidations, stringPhone('phone'));
const withUpdateEmailValidations = withValidations(loginIdValidations, stringEmail('email'));

const withOtp = (httpClient: HttpClient) => ({
	verify: Object.keys(DeliveryMethods).reduce(
		(acc, delivery) => ({
			...acc,
			[delivery]: withVerifyValidations(
				(loginId: string, code: string): Promise<SdkResponse<JWTResponse>> =>
					transformResponse(
						httpClient.post(pathJoin(apiPaths.otp.verify, delivery), { code, loginId })
					)
			)
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
				): Promise<SdkResponse<never>> =>
					transformResponse(
						httpClient.post(
							pathJoin(apiPaths.otp.signIn, delivery),
							{ loginId, loginOptions },
							{ token }
						)
					)
			)
		}),
		{}
	) as Otp[Routes.signIn],

	signUp: Object.keys(DeliveryMethods).reduce(
		(acc, delivery) => ({
			...acc,
			[delivery]: withSignValidations(
				(loginId: string, user?: User): Promise<SdkResponse<never>> =>
					transformResponse(
						httpClient.post(pathJoin(apiPaths.otp.signUp, delivery), { loginId, user })
					)
			)
		}),
		{}
	) as Otp[Routes.signUp],

	signUpOrIn: Object.keys(DeliveryMethods).reduce(
		(acc, delivery) => ({
			...acc,
			[delivery]: withSignValidations(
				(loginId: string): Promise<SdkResponse<never>> =>
					transformResponse(
						httpClient.post(pathJoin(apiPaths.otp.signUpOrIn, delivery), { loginId })
					)
			)
		}),
		{}
	) as Otp[Routes.signIn],

	update: {
		email: withUpdateEmailValidations(
			(loginId: string, email: string, token?: string): Promise<SdkResponse<never>> =>
				transformResponse(httpClient.post(apiPaths.otp.update.email, { loginId, email }, { token }))
		),
		phone: Object.keys(DeliveryPhone).reduce(
			(acc, delivery) => ({
				...acc,
				[delivery]: withUpdatePhoneValidations(
					(loginId: string, phone: string, token?: string): Promise<SdkResponse<never>> =>
						transformResponse(
							httpClient.post(
								pathJoin(apiPaths.otp.update.phone, delivery),
								{ loginId, phone },
								{ token }
							)
						)
				)
			}),
			{}
		) as Otp[Routes.updatePhone]
	}
});

export default withOtp;
