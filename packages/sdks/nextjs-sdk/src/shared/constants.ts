// Replaced in build time
declare const BUILD_VERSION: string;

// eslint-disable-next-line import/prefer-default-export
export const baseHeaders = {
	'x-descope-sdk-name': 'nextjs',
	'x-descope-sdk-version': BUILD_VERSION
};
