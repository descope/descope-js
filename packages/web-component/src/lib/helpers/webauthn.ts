/* eslint @typescript-eslint/no-use-before-define: 0 */

import { withMemCache, timeoutPromise, getChromiumVersion } from './helpers';

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
    const isSupported = Promise.all([
      (<any>window.PublicKeyCredential)?.isConditionalMediationAvailable(),
      window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable(),
    ]).then((arr) => arr.every((value) => !!value));

    // when using Dashlane Chrome extension, "isConditionalMediationAvailable" never resolved and the app hangs
    // if timeout exceeded, we are deciding if passkeys are supported based on the Chromium version
    const CHROMIUM_VERSION_THAT_SUPPORTS_PASSKEYS = 108;
    return await Promise.race([
      isSupported,
      timeoutPromise(100).catch(
        () => getChromiumVersion() >= CHROMIUM_VERSION_THAT_SUPPORTS_PASSKEYS
      ),
    ]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('webauthn', 'Conditional login check failed', err);
    return false;
  }
});
