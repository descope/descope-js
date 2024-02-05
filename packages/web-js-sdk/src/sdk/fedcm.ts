import { JWTResponse, SdkResponse, LoginOptions } from '@descope/core-js-sdk';
import { IS_BROWSER } from '../constants';
import { CoreSdk } from '../types';

/**
 * Configuration for OneTap.
 */
interface OneTapConfig {
  /** Whether to auto select. Optional. */
  auto_select?: boolean;

  /** Login URI. Optional. */
  login_uri?: string;

  /** Native callback function to handle the response. Optional. */
  native_callback?: (response: CredentialResponse) => void;

  /** Whether to cancel on tap outside. Optional. */
  cancel_on_tap_outside?: boolean;

  /** ID of the prompt parent. Optional. */
  prompt_parent_id?: string;

  /** Nonce. Optional. */
  nonce?: string;

  /** Context. Optional. */
  context?: string;

  /** Domain for the state cookie. Optional. */
  state_cookie_domain?: string;

  /** UX mode. Optional. */
  ux_mode?: string;

  /** Allowed parent origin. Can be a string or an array of strings. Optional. */
  allowed_parent_origin?: string | string[];

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

  /** Client ID. */
  clientId: string;
}

type OneTapInitialize = ({
  client_id,
  callback,
  nonce,
}: {
  client_id: string;
  callback: (res: CredentialResponse) => void;
  nonce: string;
}) => void;
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
        client_id: clientId,
        callback,
        nonce,
      });

      googleClient.prompt();
    });
  },
});

// Helpers functions
async function getGoogleClient(): Promise<{
  initialize: OneTapInitialize;
  prompt: () => void;
}> {
  return new Promise((resolve, reject) => {
    let googleScript = document.getElementById(
      'google-gsi-client-script',
    ) as HTMLScriptElement;
    if (!googleScript) {
      googleScript = document.createElement('script');
      googleScript.src = 'https://accounts.google.com/gsi/client';
      googleScript.async = true;
      googleScript.defer = true;
      googleScript.id = 'google-gsi-client-script';
      document.head.appendChild(googleScript);
    } else if ((window as any).google) {
      resolve((window as any).google.accounts.id);
    } else {
      reject('Failed to load Google GSI client script - already loading');
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
