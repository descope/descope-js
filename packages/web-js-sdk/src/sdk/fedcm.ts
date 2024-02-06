import { JWTResponse, SdkResponse, LoginOptions } from '@descope/core-js-sdk';
import { CoreSdk } from '../types';

/**
 * Configuration for OneTap.
 */
interface OneTapConfig {
  /** Whether to auto select. Optional. */
  auto_select?: boolean;

  /** Whether to cancel on tap outside. Optional. */
  cancel_on_tap_outside?: boolean;

  /** ID of the prompt parent. Optional. */
  prompt_parent_id?: string;

  /** Context. Optional. */
  context?: 'signin' | 'signup' | 'use';

  /** Callback function to handle the intermediate iframe close event. Optional. */
  intermediate_iframe_close_callback?: () => void;

  /** Whether to support ITP. Optional. */
  itp_support?: boolean;

  /** Login hint. Optional. */
  login_hint?: string;

  /** HD. Optional. */
  hd?: string;

  /** Whether to use FedCM for prompt. Optional. */
  use_fedcm_for_prompt?: boolean;
}

/**
 * Response from the credential.
 */
interface CredentialResponse {
  /** Credential. */
  credential: string;

  /** How the selection was made. */
  select_by:
    | 'auto'
    | 'user'
    | 'user_1tap'
    | 'user_2tap'
    | 'btn'
    | 'btn_confirm'
    | 'btn_add_session'
    | 'btn_confirm_add_session';
}

type OneTapInitialize = ({
  client_id,
  callback,
  nonce,
}: {
  client_id: string;
  callback: (res: CredentialResponse) => void;
  nonce: string;
} & OneTapConfig) => void;

type PromptNotification = {
  isSkippedMoment: () => boolean;
};

/**
 * Constructs a higher level FedCM API that wraps the functions from code-js-sdk.
 * @param sdk The CoreSdk instance.
 * @returns The FedCM API.
 */
const createFedCM = (sdk: CoreSdk) => ({
  async oneTap(
    provider: string,
    oneTapConfig?: OneTapConfig,
    loginOptions?: LoginOptions,
    onSkip?: () => void,
  ) {
    const startResponse = await sdk.oauth.startNative(provider, loginOptions);
    if (!startResponse.ok) {
      return startResponse as unknown as SdkResponse<JWTResponse>;
    }

    const { clientId, stateId, nonce } = startResponse.data;
    const googleClient = await getGoogleClient();
    return new Promise((resolve) => {
      const callback = (res: CredentialResponse) => {
        resolve(
          sdk.oauth.finishNative(provider, stateId, '', '', res.credential),
        );
      };

      // initialize google client
      googleClient.initialize({
        ...oneTapConfig,
        itp_support: oneTapConfig?.itp_support ?? true,
        use_fedcm_for_prompt: oneTapConfig?.use_fedcm_for_prompt ?? true,
        client_id: clientId,
        callback,
        nonce,
      });

      googleClient.prompt((notification) => {
        if (notification?.isSkippedMoment()) {
          onSkip?.();
        }
      });
    });
  },
});

// Helpers functions
async function getGoogleClient(): Promise<{
  initialize: OneTapInitialize;
  prompt: (cb: (notification: PromptNotification) => void) => void;
}> {
  return new Promise((resolve, reject) => {
    if ((window as any).google) {
      resolve((window as any).google.accounts.id);
      return;
    }

    let googleScript = document.getElementById(
      'google-gsi-client-script',
    ) as HTMLScriptElement;

    if (!googleScript) {
      googleScript = document.createElement('script');
      document.head.appendChild(googleScript);
      googleScript.async = true;
      googleScript.defer = true;
      googleScript.id = 'google-gsi-client-script';
      googleScript.src = 'https://accounts.google.com/gsi/client';
    }

    googleScript.onload = function () {
      if ((window as any).google) {
        resolve((window as any).google.accounts.id);
      } else {
        reject('Failed to load Google GSI client script - not loaded properly');
      }
    };
    googleScript.onerror = function () {
      reject('Failed to load Google GSI client script - failed to load');
    };
  });
}

export default createFedCM;
export type { OneTapConfig };
