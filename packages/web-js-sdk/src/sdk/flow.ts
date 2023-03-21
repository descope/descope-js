import { CoreSdk, ReplaceParam } from '../types';
import { isSupported } from './webauthn';

type CoreSdkFlowStartArgs = Parameters<CoreSdk['flow']['start']>;
type Options = Pick<CoreSdkFlowStartArgs[1], 'tenant' | 'redirectUrl'> & {
  lastAuth?: Omit<CoreSdkFlowStartArgs[1]['lastAuth'], 'loginId' | 'name'>;
};

export default (coreSdk: CoreSdk) => ({
  ...coreSdk.flow,
  // wrap start fn and adds more data to the start options
  start: async (...args: ReplaceParam<CoreSdkFlowStartArgs, '1', Options>) => {
    const webAuthnSupport = await isSupported();
    const decoratedOptions = {
      redirectUrl: window.location.href,
      ...args[1],
      deviceInfo: {
        webAuthnSupport,
      },
    };

    args[1] = decoratedOptions;

    return coreSdk.flow.start(...args);
  },
});
