/* eslint @typescript-eslint/no-use-before-define: 0 */

import { withMemCache } from './helpers';

// eslint-disable-next-line import/prefer-default-export
export const isConditionalLoginSupported = withMemCache(async () => {
	if (
		!window.PublicKeyCredential ||
		!(<any>PublicKeyCredential).isConditionalMediationAvailable ||
		!PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
	) {
		// eslint-disable-next-line no-console
		console.warn('webauthn', 'Conditional UI is not supported');
		return false;
	}
	try {
		const supported = await Promise.all([
			(<any>PublicKeyCredential).isConditionalMediationAvailable(),
			PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
		]);
		return supported.every((value) => !!value);
	} catch (err) {
		// eslint-disable-next-line no-console
		console.warn('webauthn', 'Conditional login check failed', err);
		return false;
	}
});
