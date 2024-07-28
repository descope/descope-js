// Replaced in build time
declare const BUILD_VERSION: string;

export const DESCOPE_SESSION_HEADER = 'x-descope-session';

export const baseHeaders = {
	'x-descope-sdk-name': 'nextjs',
	'x-descope-sdk-version': BUILD_VERSION
};

export const DEFAULT_PUBLIC_ROUTES = {
	signIn: process.env.SIGN_IN_ROUTE || '/sign-in',
	signUp: process.env.SIGN_UP_ROUTE || '/sign-up'
};
