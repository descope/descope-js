/* eslint @typescript-eslint/no-use-before-define: 0 */

import { withMemCache, timeoutPromise, getChromiumVersion } from './helpers';

const CHROMIUM_VERSION_THAT_SUPPORTS_PASSKEYS = 108;

// eslint-disable-next-line import/prefer-default-export
export const isConditionalLoginSupported = withMemCache(async () => {
  if (
    !window.PublicKeyCredential ||
    !(<any>PublicKeyCredential).isConditionalMediationAvailable ||
    !PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
  ) {
    return false;
  }
  try {
    const isSupported = Promise.all([
      (<any>window.PublicKeyCredential)?.isConditionalMediationAvailable(),
      window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable(),
    ]).then((arr) => arr.every((value) => !!value));

    // when using Dashlane Chrome extension, "isConditionalMediationAvailable" never resolved and the app hangs
    // if timeout exceeded, we are deciding if passkeys are supported based on the Chromium version
    const isChromiumSupported =
      getChromiumVersion() >= CHROMIUM_VERSION_THAT_SUPPORTS_PASSKEYS;

    return await timeoutPromise(100, isSupported, isChromiumSupported);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Conditional login check failed', err);
    return false;
  }
});
