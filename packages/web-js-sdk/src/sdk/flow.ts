import { CoreSdk, ReplaceParam } from '../types';
import { isSupported } from './webauthn';

type CoreSdkFlowStartArgs = Parameters<CoreSdk['flow']['start']>;
type Options = Pick<
  CoreSdkFlowStartArgs[1],
  | 'tenant'
  | 'redirectUrl'
  | 'redirectAuth'
  | 'oidcIdpStateId'
  | 'samlIdpStateId'
  | 'samlIdpUsername'
  | 'ssoAppId'
  | 'oidcLoginHint'
  | 'preview'
  | 'abTestingKey'
  | 'client'
> & {
  lastAuth?: Omit<CoreSdkFlowStartArgs[1]['lastAuth'], 'loginId' | 'name'>;
};

const START_OPTIONS_VERSION_PREFER_START_REDIRECT_URL = 1;

export default (coreSdk: CoreSdk) => ({
  ...coreSdk.flow,
  // wrap start fn and adds more data to the start options
  start: async (...args: ReplaceParam<CoreSdkFlowStartArgs, '1', Options>) => {
    const webAuthnSupport = await isSupported();
    const decoratedOptions = {
      location: window.location.href,
      ...args[1],
      deviceInfo: {
        webAuthnSupport,
      },
      startOptionsVersion: START_OPTIONS_VERSION_PREFER_START_REDIRECT_URL,
    };

    args[1] = decoratedOptions;

    return coreSdk.flow.start(...args);
  },
});
